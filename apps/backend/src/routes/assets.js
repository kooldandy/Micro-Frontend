import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { signAssetToken } from "@mfe/asset-token";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REMOTE_DIR_NAME = { authApp: "auth", profileApp: "profile", productApp: "product" };
const REMOTES = Object.keys(REMOTE_DIR_NAME);

export const assetsRouter = Router();

// Tier 2 (docs/07-security-architecture.md): mints a short-lived signed
// token the host must append to a remote's remoteEntry.js request. Public
// on purpose — /auth/login has to be loadable by users with no session yet.
assetsRouter.get("/token", (req, res) => {
  const remote = req.query.remote;
  if (typeof remote !== "string" || !REMOTES.includes(remote)) {
    res.status(400).json({ message: `remote must be one of ${REMOTES.join(", ")}` });
    return;
  }
  res.json(signAssetToken(remote));
});

function sha384OfFile(filePath) {
  try {
    return crypto.createHash("sha384").update(fs.readFileSync(filePath)).digest("hex");
  } catch {
    return null;
  }
}

// SRI-lite manifest: SHA-384 of each remote's built remoteEntry.js, read
// fresh off disk on every call (not cached) so it always reflects the last
// `yarn build`. Returns null per-remote if that app hasn't been built yet.
assetsRouter.get("/manifest", (_req, res) => {
  const manifest = {};
  for (const remote of REMOTES) {
    const filePath = path.resolve(__dirname, "../../../", REMOTE_DIR_NAME[remote], "dist/assets/remoteEntry.js");
    const sha384 = sha384OfFile(filePath);
    manifest[remote] = sha384 ? { file: "remoteEntry.js", sha384 } : null;
  }
  res.json(manifest);
});
