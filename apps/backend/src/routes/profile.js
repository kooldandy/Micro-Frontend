import { Router } from "express";
import { requireAuth } from "../middleware/session.js";
import { getProfile, upsertProfile } from "../data/profiles.js";

export const profileRouter = Router();

profileRouter.get("/:id", requireAuth, (req, res) => {
  if (req.params.id !== req.userId) {
    res.status(403).json({ message: "cannot view another user's profile" });
    return;
  }
  const profile = getProfile(req.userId);
  if (!profile) {
    res.status(404).json({ message: "profile not found" });
    return;
  }
  res.json(profile);
});

profileRouter.put("/:id", requireAuth, (req, res) => {
  if (req.params.id !== req.userId) {
    res.status(403).json({ message: "cannot edit another user's profile" });
    return;
  }
  const { name, bio } = req.body ?? {};
  res.json(upsertProfile(req.userId, { name, bio }));
});
