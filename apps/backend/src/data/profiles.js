const profiles = new Map();

profiles.set("u_1", {
  id: "u_1",
  name: "Demo User",
  email: "demo@example.com",
  bio: "Hi, I'm the seeded demo user for this microfrontend scaffold.",
});

export function getProfile(userId) {
  return profiles.get(userId);
}

export function upsertProfile(userId, changes) {
  const current = profiles.get(userId) ?? { id: userId, name: "", email: "", bio: "" };
  const updated = { ...current, ...changes, id: userId };
  profiles.set(userId, updated);
  return updated;
}

export function createProfileForUser(userId, email) {
  const profile = { id: userId, name: email.split("@")[0], email, bio: "" };
  profiles.set(userId, profile);
  return profile;
}
