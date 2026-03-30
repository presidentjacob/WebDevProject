const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-in-production";
const DB_PATH = path.join(__dirname, "sortio.db");

const db = new sqlite3.Database(DB_PATH);

app.use(express.json());
app.use(express.static(__dirname));

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

function createToken(user) {
  return jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: "7d"
  });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password || password.length < 6) {
    res.status(400).json({ error: "Username and password (min 6 chars) are required." });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await run(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)",
      [username.trim(), passwordHash]
    );

    const user = { id: result.lastID, username: username.trim() };
    const token = createToken(user);
    res.status(201).json({ token, user });
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) {
      res.status(409).json({ error: "Username already exists." });
      return;
    }
    res.status(500).json({ error: "Failed to create account." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required." });
    return;
  }

  try {
    const user = await get("SELECT * FROM users WHERE username = ?", [username.trim()]);
    if (!user) {
      res.status(401).json({ error: "Invalid username or password." });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid username or password." });
      return;
    }

    const safeUser = { id: user.id, username: user.username };
    const token = createToken(safeUser);
    res.json({ token, user: safeUser });
  } catch {
    res.status(500).json({ error: "Failed to log in." });
  }
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const user = await get("SELECT id, username, created_at FROM users WHERE id = ?", [req.user.userId]);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user });
  } catch {
    res.status(500).json({ error: "Failed to fetch user." });
  }
});

app.get("/api/lists", requireAuth, async (req, res) => {
  try {
    const lists = await all(
      "SELECT id, title, description, created_at FROM lists WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.userId]
    );
    res.json({ lists });
  } catch {
    res.status(500).json({ error: "Failed to load lists." });
  }
});

app.post("/api/lists", requireAuth, async (req, res) => {
  const { title, description } = req.body || {};
  if (!title || !title.trim()) {
    res.status(400).json({ error: "Title is required." });
    return;
  }

  try {
    const result = await run(
      "INSERT INTO lists (user_id, title, description) VALUES (?, ?, ?)",
      [req.user.userId, title.trim(), (description || "").trim()]
    );

    const created = await get(
      "SELECT id, title, description, created_at FROM lists WHERE id = ?",
      [result.lastID]
    );
    res.status(201).json({ list: created });
  } catch {
    res.status(500).json({ error: "Failed to create list." });
  }
});

app.get("/api/lists/:id", requireAuth, async (req, res) => {
  try {
    const list = await get(
      "SELECT id, title, description, created_at FROM lists WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.userId]
    );

    if (!list) {
      res.status(404).json({ error: "List not found." });
      return;
    }

    res.json({ list });
  } catch {
    res.status(500).json({ error: "Failed to load list." });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Sort.io server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Database init failed:", error);
    process.exit(1);
  });
