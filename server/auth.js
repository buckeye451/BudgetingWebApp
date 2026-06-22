import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import db from "./db.js";

const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
export const COOKIE_NAME = "budget_session";

/* ---------- Password hashing (scrypt, built into Node) ---------- */
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password, salt, expectedHash) {
  const hash = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");
  return hash.length === expected.length && timingSafeEqual(hash, expected);
}

/* ---------- Sessions ---------- */
export function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_MS;
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .run(token, userId, expiresAt);
  return { token, expiresAt };
}

export function destroySession(token) {
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

/* ---------- Cookie helpers ---------- */
export function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export function setSessionCookie(res, token, expiresAt) {
  const secure = process.env.COOKIE_SECURE === "true" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; ` +
      `Expires=${new Date(expiresAt).toUTCString()}${secure}`
  );
}

export function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
  );
}

/* ---------- Middleware: attach req.user if logged in ---------- */
export function authMiddleware(req, res, next) {
  const token = parseCookies(req)[COOKIE_NAME];
  if (token) {
    const session = db
      .prepare("SELECT * FROM sessions WHERE token = ?")
      .get(token);
    if (session && session.expires_at > Date.now()) {
      const user = db
        .prepare("SELECT id, username FROM users WHERE id = ?")
        .get(session.user_id);
      if (user) {
        req.user = user;
        req.sessionToken = token;
      }
    } else if (session) {
      destroySession(token); // expired
    }
  }
  next();
}

/* Guard for API routes that require a logged-in user. */
export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  next();
}
