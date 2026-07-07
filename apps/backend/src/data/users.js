import bcrypt from "bcryptjs";

const users = new Map();
let nextId = 2;

function seed() {
  users.set("u_1", {
    id: "u_1",
    email: "demo@example.com",
    passwordHash: bcrypt.hashSync("password123", 10),
  });
}
seed();

export function findUserByEmail(email) {
  return [...users.values()].find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id) {
  return users.get(id);
}

export function createUser(email, password) {
  const id = `u_${nextId++}`;
  const user = { id, email, passwordHash: bcrypt.hashSync(password, 10) };
  users.set(id, user);
  return user;
}

export function verifyPassword(user, password) {
  return bcrypt.compareSync(password, user.passwordHash);
}

/** Strips the password hash before anything crosses the network. */
export function toPublicUser(user) {
  return { id: user.id, email: user.email };
}
