const http = require("http");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "taskdb",
    user: process.env.DB_USER || "taskuser",
    password: process.env.DB_PASSWORD || "taskpassword"
});

function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json"
    });
    res.end(JSON.stringify(data, null, 2));
}

async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            completed BOOLEAN NOT NULL DEFAULT FALSE
        )
    `);

    console.log("PostgreSQL tasks table is ready");
}

const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, "http://localhost:3000");
        const pathname = url.pathname;

        // Serve the Task Manager webpage
        if (req.method === "GET" && pathname === "/") {
            res.writeHead(200, {
                "Content-Type": "text/html; charset=utf-8"
            });
            res.end(fs.readFileSync(path.join(__dirname, "index.html")));
            return;
        }

        // READ: Get all tasks
        if (req.method === "GET" && pathname === "/tasks") {
            const result = await pool.query(
                "SELECT id, title, completed FROM tasks ORDER BY id"
            );
            sendJSON(res, 200, result.rows);
            return;
        }

        // CREATE: Add a task
        if (req.method === "POST" && pathname === "/tasks") {
            const body = await readRequestBody(req);
            const { title } = JSON.parse(body);

            if (typeof title !== "string" || !title.trim()) {
                sendJSON(res, 400, {
                    error: "A task title is required"
                });
                return;
            }

            const result = await pool.query(
                `INSERT INTO tasks (title)
                 VALUES ($1)
                 RETURNING id, title, completed`,
                [title.trim()]
            );

            sendJSON(res, 201, result.rows[0]);
            return;
        }

        // UPDATE: Edit title or completion status
        if (req.method === "PUT" && pathname.startsWith("/tasks/")) {
            const id = Number(pathname.split("/")[2]);

            if (!Number.isInteger(id) || id < 1) {
                sendJSON(res, 400, { error: "Invalid task ID" });
                return;
            }

            const body = await readRequestBody(req);
            const updates = JSON.parse(body);

            if (
                updates.title !== undefined &&
                (typeof updates.title !== "string" ||
                 !updates.title.trim())
            ) {
                sendJSON(res, 400, {
                    error: "Title must be a non-empty string"
                });
                return;
            }

            if (
                updates.completed !== undefined &&
                typeof updates.completed !== "boolean"
            ) {
                sendJSON(res, 400, {
                    error: "Completed must be true or false"
                });
                return;
            }

            if (
                updates.title === undefined &&
                updates.completed === undefined
            ) {
                sendJSON(res, 400, {
                    error: "Provide a title or completed field"
                });
                return;
            }

            const result = await pool.query(
                `UPDATE tasks
                 SET title = COALESCE($1, title),
                     completed = COALESCE($2, completed)
                 WHERE id = $3
                 RETURNING id, title, completed`,
                [
                    updates.title === undefined
                        ? null
                        : updates.title.trim(),
                    updates.completed === undefined
                        ? null
                        : updates.completed,
                    id
                ]
            );

            if (result.rowCount === 0) {
                sendJSON(res, 404, { error: "Task not found" });
                return;
            }

            sendJSON(res, 200, result.rows[0]);
            return;
        }

        // DELETE: Remove a task
        if (req.method === "DELETE" && pathname.startsWith("/tasks/")) {
            const id = Number(pathname.split("/")[2]);

            if (!Number.isInteger(id) || id < 1) {
                sendJSON(res, 400, { error: "Invalid task ID" });
                return;
            }

            const result = await pool.query(
                `DELETE FROM tasks
                 WHERE id = $1
                 RETURNING id`,
                [id]
            );

            if (result.rowCount === 0) {
                sendJSON(res, 404, { error: "Task not found" });
                return;
            }

            sendJSON(res, 200, {
                message: `Task ${id} deleted successfully`
            });
            return;
        }

        sendJSON(res, 404, { error: "Route not found" });
    } catch (error) {
        console.error("Request error:", error);
        sendJSON(res, 500, { error: "Internal server error" });
    }
});

function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";

        req.on("data", chunk => {
            body += chunk;

            if (body.length > 10000) {
                reject(new Error("Request body too large"));
                req.destroy();
            }
        });

        req.on("end", () => resolve(body));
        req.on("error", reject);
    });
}

async function startServer() {
    await initializeDatabase();

    server.listen(3000, "0.0.0.0", () => {
        console.log("Server running on port 3000");
    });
}

startServer().catch(error => {
    console.error("Could not start application:", error);
    process.exit(1);
});