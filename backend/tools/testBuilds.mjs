// Exercises the save-and-share routes against a throwaway database, so the
// round trip can be proved without depending on a hosted cluster.
//
//   node tools/testBuilds.mjs

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import express from "express";

const server = await MongoMemoryServer.create();
await mongoose.connect(server.getUri("autoverse-test"));

const { default: buildsRoute } = await import("../routes/builds.js");

const app = express();
app.use(express.json());
app.use("/builds", buildsRoute);

const listener = app.listen(0);
const port = listener.address().port;
const base = `http://127.0.0.1:${port}`;

const checks = [];
const check = (name, passed, detail = "") =>
  checks.push({ name, passed, detail });

const spec = {
  color: "#c0242c",
  finish: "matte",
  wheelType: "classic",
  wheelSize: 3,
  stance: 0.8,
  spoilerType: "racing",
  exhaustType: "quad",
  headlightType: "laser",
  underglow: "toxic",
  wrapMode: "stripes",
  wrapColour: "#f4f6f8",
  tintLevel: "limo"
};

// SAVE
const saved = await fetch(`${base}/builds`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ carId: 9, carName: "BMW M4", total: 41500, spec })
});

const savedBody = await saved.json();
check("save returns 201", saved.status === 201, `got ${saved.status}`);
check(
  "share code is six readable characters",
  /^[A-HJ-NP-Z2-9]{6}$/.test(savedBody.code || ""),
  `got ${savedBody.code}`
);

// LOAD
const loaded = await fetch(`${base}/builds/${savedBody.code}`);
const loadedBody = await loaded.json();

check("load returns 200", loaded.status === 200, `got ${loaded.status}`);
check("car survives the round trip", loadedBody.carName === "BMW M4");
check("total survives the round trip", loadedBody.total === 41500);

const mismatched = Object.keys(spec).filter(
  (key) => loadedBody.spec?.[key] !== spec[key]
);
check(
  "every spec field survives the round trip",
  mismatched.length === 0,
  mismatched.join(", ")
);

// LOWERCASE CODES SHOULD STILL RESOLVE
const lower = await fetch(`${base}/builds/${savedBody.code.toLowerCase()}`);
check("codes are case insensitive", lower.status === 200, `got ${lower.status}`);

// MISSING CODE
const missing = await fetch(`${base}/builds/ZZZZZZ`);
check("unknown code returns 404", missing.status === 404, `got ${missing.status}`);

// VALIDATION
const invalid = await fetch(`${base}/builds`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ spec })
});
check("missing car returns 400", invalid.status === 400, `got ${invalid.status}`);

// REPORT
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
