const { Pool } = require("pg");

const base = {
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "appdb",
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000
};

// ---- Primary (all writes) ----
const primary = new Pool({
    ...base,
    host: process.env.DB_PRIMARY_HOST || "127.0.0.1",
    port: Number(process.env.DB_PRIMARY_PORT || 5432)
});

// ---- Replicas (reads) e.g. DB_REPLICAS=127.0.0.1:5433,127.0.0.1:5434 ----
const replicas = (process.env.DB_REPLICAS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(hostPort => {
        const [host, port] = hostPort.split(":");
        const pool = new Pool({ ...base, host, port: Number(port || 5432) });
        pool.label = hostPort;
        pool.healthy = true;
        pool.on("error", err => console.error(`[db] replica ${hostPort} error:`, err.message));
        return pool;
    });

primary.label = `${primary.options.host}:${primary.options.port}`;
primary.on("error", err => console.error("[db] primary error:", err.message));

let rr = 0;

// Pick next healthy replica (round-robin); fall back to primary
const pickReplica = () => {
    for (let i = 0; i < replicas.length; i++) {
        const pool = replicas[rr++ % replicas.length];
        if (pool.healthy) return pool;
    }
    return primary;
};

/** Write query -> primary */
const write = (text, params) => primary.query(text, params);

/** Read query -> replica (falls back to primary on failure) */
const read = async (text, params) => {
    const pool = pickReplica();
    try {
        return await pool.query(text, params);
    } catch (err) {
        if (pool === primary) throw err;
        console.warn(`[db] replica ${pool.label} failed (${err.message}), using primary`);
        pool.healthy = false;
        setTimeout(() => { pool.healthy = true; }, 10000); // retry after 10s
        return primary.query(text, params);
    }
};

/** Run multiple statements in a transaction on the primary */
const transaction = async (fn) => {
    const client = await primary.connect();
    try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

/** Status of primary + each replica (role and replication lag) */
const status = async () => {
    const check = async (pool) => {
        try {
            const { rows } = await pool.query(
                `SELECT pg_is_in_recovery() AS is_replica,
                        CASE WHEN pg_is_in_recovery()
                             THEN EXTRACT(EPOCH FROM now() - pg_last_xact_replay_timestamp())
                        END AS lag_seconds`
            );
            return { node: pool.label, up: true, role: rows[0].is_replica ? "replica" : "primary", lagSeconds: rows[0].lag_seconds };
        } catch (err) {
            return { node: pool.label, up: false, error: err.message };
        }
    };
    return Promise.all([primary, ...replicas].map(check));
};

module.exports = { write, read, transaction, status, primary, replicas };
