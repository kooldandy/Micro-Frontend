import { Router } from "express";
import { createUser, findUserByEmail, findUserById, toPublicUser, verifyPassword } from "../data/users.js";
import { createProfileForUser } from "../data/profiles.js";
import {
  SESSION_COOKIE_NAME,
  createSession,
  destroySession,
  getSession,
  sessionCookieOptions,
} from "../middleware/session.js";

export const authRouter = Router();

authRouter.post("/register", (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ message: "email and password are required" });
    return;
  }
  if (findUserByEmail(email)) {
    res.status(409).json({ message: "an account with that email already exists" });
    return;
  }
  const user = createUser(email, password);
  createProfileForUser(user.id, user.email);
  res.cookie(SESSION_COOKIE_NAME, createSession(user.id), sessionCookieOptions());
  res.status(201).json({ user: toPublicUser(user) });
});

authRouter.post("/login", (req, res) => {
  const { email, password } = req.body ?? {};
  const user = email ? findUserByEmail(email) : undefined;
  if (!user || !verifyPassword(user, password ?? "")) {
    res.status(401).json({ message: "invalid email or password" });
    return;
  }
  res.cookie(SESSION_COOKIE_NAME, createSession(user.id), sessionCookieOptions());
  res.json({ user: toPublicUser(user) });
});

authRouter.post("/logout", (req, res) => {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
  if (sessionId) destroySession(sessionId);
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
  res.status(204).end();
});

// Session bootstrap/rehydrate: called on mount by auth-app so a page reload
// (which loses in-memory Redux state but keeps the httpOnly cookie) can
// re-derive "am I logged in" without ever touching localStorage.
authRouter.get("/session", (req, res) => {
  const session = getSession(req.cookies?.[SESSION_COOKIE_NAME]);
  const user = session && findUserById(session.userId);
  if (!user) {
    res.status(401).json({ message: "no active session" });
    return;
  }
  res.json({ user: toPublicUser(user) });
});
