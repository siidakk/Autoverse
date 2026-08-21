#!/usr/bin/env node
//
// A database on this machine, for when there is no hosted one.
//
//   node tools/localMongo.mjs
//
// The hosted Atlas cluster this project was pointed at no longer exists, and
// standing a new one up is an account decision rather than a code one. In the
// meantime this runs a real mongod locally and keeps its data in backend/.data,
// so accounts and saved builds survive restarts the way they would anywhere
// else. start.bat launches it, so normally nobody has to run this by hand.

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { MongoMemoryServer } from "mongodb-memory-server";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, "..", ".data", "mongo");

fs.mkdirSync(dataDir, { recursive: true });

const PORT = 27019;

console.log("\n  Starting a local database...");

let server;

try {
  server = await MongoMemoryServer.create({
    instance: {
      port: PORT,
      dbPath: dataDir,
      // Without this the data lives in memory and is gone when the window
      // closes, which is fine for a test and useless for actually using it.
      storageEngine: "wiredTiger"
    }
  });
} catch (error) {
  console.error("\n  Could not start it:", error.message);
  console.error(
    "\n  If the port is already taken, something else is on 27019.\n" +
    "  If the download failed, this needs one connection to fetch mongod the\n" +
    "  first time, after which it works offline.\n"
  );
  process.exit(1);
}

console.log(`  Running on ${server.getUri("autoverse")}`);
console.log(`  Data kept in ${path.relative(process.cwd(), dataDir)}`);
console.log("\n  Leave this window open. Ctrl+C stops it.\n");

const stop = async () => {
  console.log("\n  Stopping the database...");
  await server.stop();
  process.exit(0);
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

// Hold the process open.
await new Promise(() => {});
