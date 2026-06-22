import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import db from "./db.js";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  authMiddleware,
  requireAuth,
} from "./auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(authMiddleware);

/* Whether new accounts may be created right now.
   - Always allowed if there are no users yet (first-run setup).
   - Otherwise only allowed when a SIGNUP_CODE is configured and matches. */
function registrationStatus() {
  const count = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  return { open: count === 0, codeRequired: !!process.env.SIGNUP_CODE, userCount: count };
}

/* ---------- Auth API ---------- */
app.get("/api/me", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  res.json({ username: req.user.username });
});

app.get("/api/registration-status", (req, res) => {
  const s = registrationStatus();
  res.json({ canRegister: s.open || s.codeRequired, codeRequired: s.codeRequired && !s.open });
});

app.post("/api/register", (req, res) => {
  const { username, password, code } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const status = registrationStatus();
  if (!status.open) {
    // Registration closed unless a signup code is set and matches.
    if (!process.env.SIGNUP_CODE) {
      return res.status(403).json({ error: "Registration is closed on this instance." });
    }
    if (code !== process.env.SIGNUP_CODE) {
      return res.status(403).json({ error: "Invalid signup code." });
    }
  }

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) return res.status(409).json({ error: "That username is taken." });

  const { hash, salt } = hashPassword(password);
  const info = db
    .prepare("INSERT INTO users (username, pw_hash, pw_salt, created_at) VALUES (?, ?, ?, ?)")
    .run(username, hash, salt, new Date().toISOString());

  const { token, expiresAt } = createSession(info.lastInsertRowid);
  setSessionCookie(res, token, expiresAt);
  res.json({ username });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user || !verifyPassword(password, user.pw_salt, user.pw_hash)) {
    return res.status(401).json({ error: "Incorrect username or password." });
  }
  const { token, expiresAt } = createSession(user.id);
  setSessionCookie(res, token, expiresAt);
  res.json({ username: user.username });
});

app.post("/api/logout", (req, res) => {
  destroySession(req.sessionToken);
  clearSessionCookie(res);
  res.json({ ok: true });
});

/* ---------- Budget data API (per user) ---------- */
app.get("/api/data", requireAuth, (req, res) => {
  const row = db.prepare("SELECT json FROM budgets WHERE user_id = ?").get(req.user.id);
  res.json(row ? JSON.parse(row.json) : { months: {} });
});

app.put("/api/data", requireAuth, (req, res) => {
  const data = req.body;
  if (!data || typeof data !== "object" || typeof data.months !== "object") {
    return res.status(400).json({ error: "Invalid data payload." });
  }
  db.prepare(
    `INSERT INTO budgets (user_id, json, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`
  ).run(req.user.id, JSON.stringify(data), new Date().toISOString());
  res.json({ ok: true });
});

/* ---------- Static frontend ---------- */
const publicDir = join(__dirname, "..", "public");

// Gate the app: send unauthenticated visitors to the login page.
app.get("/", (req, res, next) => {
  if (!req.user) return res.redirect("/login.html");
  next();
});

app.use(express.static(publicDir));

app.listen(PORT, () => {
  console.log(`My Budget running at http://localhost:${PORT}`);
});
