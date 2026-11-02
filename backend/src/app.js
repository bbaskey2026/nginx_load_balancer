require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const express = require("express");

const app = express();

const userRoutes = require("./routes/userRoutes");
const db = require("./config/db");
const { AppError } = require("./utils/errors");

const PORT = process.env.PORT || 3000;

app.use(express.json());

// Identify which instance served the request (useful for verifying load balancing)
app.use((req, res, next) => {
    res.setHeader("X-Served-By", `node-${PORT}`);
    next();
});

app.get("/health", (req, res) => {
    res.json({
        message: "Node.js server is running",
        port: PORT,
        pid: process.pid
    });
});

// Shows primary/replica roles and replication lag
app.get("/health/db", async (req, res) => {
    res.json({ servedBy: `node-${PORT}`, nodes: await db.status() });
});

app.use("/api/users", userRoutes);

// Central error handler (Express 5 forwards rejected async handlers here)
app.use((err, req, res, next) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ success: false, message: "Invalid JSON body" });
    }
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error" });
});

app.listen(PORT, (err) => {
    if (err) {
        console.error(`Failed to start on port ${PORT}: ${err.code === "EADDRINUSE" ? "port already in use" : err.message}`);
        process.exit(1);
    }
    console.log(`Node.js running on port ${PORT}`);
});