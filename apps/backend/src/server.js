// Must run before anything below reads process.env — ALLOWED_ORIGINS,
// ASSET_TOKEN_SECRET, and SESSION_COOKIE_SECURE all come from apps/backend/.env,
// which nothing else in this app loads.
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.js";
import { profileRouter } from "./routes/profile.js";
import { productRouter } from "./routes/product.js";
import { assetsRouter } from "./routes/assets.js";

const PORT = process.env.PORT || 4000;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

const app = express();

// Tier 1 (docs/07-security-architecture.md): explicit origin allowlist +
// credentials, replacing a permissive wildcard CORS setup.
app.use(
  cors({
    origin(origin, callback) {
      // No Origin header at all means a non-browser caller (curl, server-to-
      // server) — browsers always send Origin on cross-origin fetch/XHR,
      // which is what this allowlist is actually guarding.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/product", productRouter);
app.use("/api/assets", assetsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "internal server error" });
});

app.listen(PORT, () => {
  console.log(`[backend] fake API listening on http://localhost:${PORT}`);
  console.log("[backend] seeded demo account: demo@example.com / password123");
});
