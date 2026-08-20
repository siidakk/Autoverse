// Exercises accounts and the garage against a throwaway database.
//
//   node tools/testAuth.mjs

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import express from "express";

const server = await MongoMemoryServer.create();
await mongoose.connect(server.getUri("autoverse-auth-test"));

const { default: authRoute } = await import("../routes/auth.js");
const { default: buildsRoute } = await import("../routes/builds.js");

const app = express();
app.use(express.json());
app.use("/auth", authRoute);
app.use("/builds", buildsRoute);

const listener = app.listen(0);
const base = `http://127.0.0.1:${listener.address().port}`;

const checks = [];
const check = (name, passed, detail = "") => checks.push({ name, passed, detail });

const call = async (path, options = {}, token = null) => {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
};

// --- registering ---
const weak = await call("/auth/register", {
  method: "POST",
  body: JSON.stringify({ email: "a@b.com", password: "short" })
});
check("a short password is refused", weak.status === 400, weak.body.error);

const badEmail = await call("/auth/register", {
  method: "POST",
  body: JSON.stringify({ email: "not-an-email", password: "longenough1" })
});
check("a malformed email is refused", badEmail.status === 400, badEmail.body.error);

const signup = await call("/auth/register", {
  method: "POST",
  body: JSON.stringify({ email: "Owner@Example.com", password: "correcthorse", name: "Owner" })
});
check("registering works", signup.status === 201, `got ${signup.status}`);
check("a token comes back", Boolean(signup.body.token));
check("the password hash is never returned",
  !JSON.stringify(signup.body).toLowerCase().includes("hash"));
check("the email is stored lowercased", signup.body.user?.email === "owner@example.com",
  signup.body.user?.email);

const again = await call("/auth/register", {
  method: "POST",
  body: JSON.stringify({ email: "owner@example.com", password: "correcthorse" })
});
check("the same email cannot register twice", again.status === 409, `got ${again.status}`);

// --- signing in ---
const wrongPass = await call("/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: "owner@example.com", password: "wrongwrongwrong" })
});
check("a wrong password is refused", wrongPass.status === 401);

const unknown = await call("/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: "nobody@example.com", password: "correcthorse" })
});
check("an unknown email gives the same answer as a wrong password",
  unknown.status === 401 && unknown.body.error === wrongPass.body.error,
  "no way to discover which emails exist");

const login = await call("/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: "OWNER@example.com", password: "correcthorse" })
});
check("signing in works, and the email is not case sensitive", login.status === 200);

const token = login.body.token;

// --- the garage ---
const noToken = await call("/builds/mine");
check("the garage needs a token", noToken.status === 401, `got ${noToken.status}`);

const forged = await call("/builds/mine", {}, "not.a.real.token");
check("a forged token is refused", forged.status === 401, `got ${forged.status}`);

const empty = await call("/builds/mine", {}, token);
check("a new account has an empty garage", empty.body.builds?.length === 0);

const saved = await call("/builds", {
  method: "POST",
  body: JSON.stringify({ carId: 9, carName: "BMW M4", total: 41500, spec: { color: "#000000" } })
}, token);
check("a signed in save works", saved.status === 201, saved.body.code);

const anonymous = await call("/builds", {
  method: "POST",
  body: JSON.stringify({ carId: 3, carName: "Mercedes G-Class", total: 12000, spec: {} })
});
check("saving without an account still works", anonymous.status === 201, anonymous.body.code);

const mine = await call("/builds/mine", {}, token);
check("the garage holds only my build", mine.body.builds?.length === 1,
  `${mine.body.builds?.length} build(s)`);
check("it is the right one", mine.body.builds?.[0]?.carName === "BMW M4");

const anonStillReadable = await call(`/builds/${anonymous.body.code}`);
check("an anonymous build is still reachable by its code", anonStillReadable.status === 200);

// --- someone else's build ---
const other = await call("/auth/register", {
  method: "POST",
  body: JSON.stringify({ email: "other@example.com", password: "correcthorse" })
});

const theirs = await call("/builds/mine", {}, other.body.token);
check("another account cannot see my builds", theirs.body.builds?.length === 0,
  `${theirs.body.builds?.length} visible`);

const steal = await call(`/builds/${saved.body.code}`, { method: "DELETE" }, other.body.token);
check("another account cannot delete my build", steal.status === 404, `got ${steal.status}`);

const removeMine = await call(`/builds/${saved.body.code}`, { method: "DELETE" }, token);
check("I can delete my own build", removeMine.status === 200, `got ${removeMine.status}`);

// --- wishlist ---
const added = await call("/auth/wishlist", {
  method: "POST",
  body: JSON.stringify({ carId: 4, name: "Toyota Fortuner" })
}, token);
check("a car can be added to the wishlist", added.body.added === true);

const removed = await call("/auth/wishlist", {
  method: "POST",
  body: JSON.stringify({ carId: 4, name: "Toyota Fortuner" })
}, token);
check("adding the same car again removes it", removed.body.added === false);

const profile = await call("/auth/me", {}, token);
check("the profile comes back", profile.status === 200 && profile.body.user?.email === "owner@example.com");

// --- report ---
console.log();
for (const entry of checks) {
  const mark = entry.passed ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`${mark} ${entry.name}${entry.detail ? ` (${entry.detail})` : ""}`);
}

const failed = checks.filter((entry) => !entry.passed).length;
console.log(`\n${checks.length - failed}/${checks.length} passed\n`);

listener.close();
await mongoose.disconnect();
await server.stop();

process.exit(failed ? 1 : 0);
