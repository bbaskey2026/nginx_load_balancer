const db = require("../config/db");

// Data access only. Reads -> replicas, writes -> primary.

exports.findAll = async () => {
    const { rows } = await db.read(
        "SELECT id, name, email, created_at, updated_at FROM users ORDER BY id"
    );
    return rows;
};

exports.findById = async (id) => {
    const { rows } = await db.read(
        "SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1",
        [id]
    );
    return rows[0] || null;
};

exports.create = async ({ name, email }) => {
    const { rows } = await db.write(
        "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email, created_at",
        [name, email]
    );
    return rows[0];
};

exports.update = async (id, { name, email }) => {
    const { rows } = await db.write(
        `UPDATE users
            SET name = COALESCE($2, name),
                email = COALESCE($3, email),
                updated_at = now()
          WHERE id = $1
      RETURNING id, name, email, created_at, updated_at`,
        [id, name ?? null, email ?? null]
    );
    return rows[0] || null;
};

exports.delete = async (id) => {
    const { rows } = await db.write(
        "DELETE FROM users WHERE id = $1 RETURNING id, name, email",
        [id]
    );
    return rows[0] || null;
};
