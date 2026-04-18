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

app.use(express.json({ limit: "10mb" }));
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

  await run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      photo_data_url TEXT,
      rating INTEGER,
      price REAL,
      quantity INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (list_id) REFERENCES lists(id)
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
  const { title, name, description } = req.body || {};
  const normalizedTitle = String(title ?? name ?? "").trim();

  if (!normalizedTitle) {
    res.status(400).json({ error: "Title is required." });
    return;
  }

  try {
    const result = await run(
      "INSERT INTO lists (user_id, title, description) VALUES (?, ?, ?)",
      [req.user.userId, normalizedTitle, (description || "").trim()]
    );

    const created = await get(
      "SELECT id, title, description, created_at FROM lists WHERE id = ?",
      [result.lastID]
    );
    res.status(201).json({ list: created, id: created.id });
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

app.get("/api/lists/:id/items", requireAuth, async (req, res) => {
  try {
    const list = await get(
      "SELECT id FROM lists WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.userId]
    );

    if (!list) {
      res.status(404).json({ error: "List not found." });
      return;
    }

    const items = await all(
      `SELECT id, name, photo_data_url, rating, price, quantity, notes, created_at
       FROM items
       WHERE list_id = ?
       ORDER BY created_at DESC`,
      [req.params.id]
    );

    res.json({ items });
  } catch {
    res.status(500).json({ error: "Failed to load items." });
  }
});

app.post("/api/lists/:id/items", requireAuth, async (req, res) => {
  const { name, photoDataUrl, rating, price, quantity, notes } = req.body || {};
  const trimmedName = String(name || "").trim();
  const trimmedNotes = String(notes || "").trim();

  if (!trimmedName) {
    res.status(400).json({ error: "Item name is required." });
    return;
  }

  const parsedQuantity = Number.parseInt(quantity, 10);
  if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
    res.status(400).json({ error: "Quantity must be a whole number of at least 1." });
    return;
  }

  let parsedRating = null;
  if (rating !== undefined && rating !== null && String(rating).trim() !== "") {
    parsedRating = Number.parseInt(rating, 10);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 10) {
      res.status(400).json({ error: "Rating must be an integer from 1 to 10." });
      return;
    }
  }

  let parsedPrice = null;
  if (price !== undefined && price !== null && String(price).trim() !== "") {
    parsedPrice = Number.parseFloat(price);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      res.status(400).json({ error: "Price must be a number of 0 or more." });
      return;
    }
  }

  let safePhotoDataUrl = null;
  if (photoDataUrl) {
    const value = String(photoDataUrl);
    if (!value.startsWith("data:image/")) {
      res.status(400).json({ error: "Photo must be an image file." });
      return;
    }
    if (value.length > 5_000_000) {
      res.status(400).json({ error: "Photo is too large." });
      return;
    }
    safePhotoDataUrl = value;
  }

  try {
    const list = await get(
      "SELECT id FROM lists WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.userId]
    );

    if (!list) {
      res.status(404).json({ error: "List not found." });
      return;
    }

    const result = await run(
      `INSERT INTO items (list_id, name, photo_data_url, rating, price, quantity, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.id,
        trimmedName,
        safePhotoDataUrl,
        parsedRating,
        parsedPrice,
        parsedQuantity,
        trimmedNotes
      ]
    );

    const created = await get(
      `SELECT id, name, photo_data_url, rating, price, quantity, notes, created_at
       FROM items WHERE id = ?`,
      [result.lastID]
    );

    res.status(201).json({ item: created });
  } catch {
    res.status(500).json({ error: "Failed to create item." });
  }
});

app.use((error, req, res, next) => {
  if (error?.type === "entity.too.large") {
    res.status(413).json({ error: "Request body is too large. Use a smaller image." });
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ error: "Invalid JSON payload." });
    return;
  }

  next(error);
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found." });
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
