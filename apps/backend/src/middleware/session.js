import crypto from "node:crypto";

// 3.3 BFF pattern (docs/07-security-architecture.md): the session id is an
// opaque random string, never a JWT the browser could inspect or forge, and
// it never leaves the server except inside an httpOnly cookie.
const sessions = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60 * 2;

export const SESSION_COOKIE_NAME = "mfe_session";

export function createSession(userId) {
  const sessionId = crypto.randomBytes(32).toString("hex");
  sessions.set(sessionId, { userId, expiresAt: Date.now() + SESSION_TTL_MS });
  return sessionId;
}

export function getSession(sessionId) {
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  return session;
}

export function destroySession(sessionId) {
  sessions.delete(sessionId);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    // MUST be true once served over https — see apps/backend/.env.example.
    secure: process.env.SESSION_COOKIE_SECURE === "true",
    sameSite: "strict",
    maxAge: SESSION_TTL_MS,
    path: "/",
  };
}

export function requireAuth(req, res, next) {
  const session = getSession(req.cookies?.[SESSION_COOKIE_NAME]);
  if (!session) {
    res.status(401).json({ message: "unauthorized" });
    return;
  }
  req.userId = session.userId;
  next();
}
