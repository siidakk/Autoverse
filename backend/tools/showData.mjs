#!/usr/bin/env node
//
// Shows what is in the database.
//
//   npm run db:show
//
// Password hashes are never printed. There is nothing useful to be learned from
// looking at one, and putting it on a terminal is how it ends up in a
// screenshot.

import mongoose from "mongoose";
import "dotenv/config";

const DIM = "\x1b[2m";
const OFF = "\x1b[0m";
const SIGNAL = "\x1b[33m";

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error("\n  MONGO_URI is not set in backend/.env\n");
  process.exit(1);
}

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
} catch (error) {
  console.error(`\n  Could not reach the database: ${error.message}`);
  console.error("\n  If you meant the local one, start it first:");
  console.error("    node tools/localMongo.mjs\n");
  process.exit(1);
}

const db = mongoose.connection.db;

console.log(`\n  ${SIGNAL}Database${OFF} ${db.databaseName}`);
console.log(`  ${DIM}${uri.replace(/:\/\/[^@]*@/, "://***:***@")}${OFF}\n`);

const collections = await db.listCollections().toArray();

if (!collections.length) {
  console.log("  Nothing in it yet. Register an account and save a build.\n");
  await mongoose.disconnect();
  process.exit(0);
}

for (const { name } of collections) {
  const count = await db.collection(name).countDocuments();
  console.log(`  ${SIGNAL}${name}${OFF} ${DIM}— ${count} document(s)${OFF}`);
  console.log("  " + "─".repeat(66));

  if (name === "users") {
    const users = await db
      .collection(name)
      .find({}, { projection: { passwordHash: 0 } })  // never shown
      .sort({ createdAt: -1 })
      .limit(25)
      .toArray();

    for (const user of users) {
      console.log(
        `  ${(user.email ?? "").padEnd(34)} ${(user.name || "—").padEnd(16)} ` +
        `${DIM}${user.createdAt ? new Date(user.createdAt).toLocaleString("en-IN") : ""}${OFF}`
      );
      if (user.wishlist?.length) {
        console.log(`  ${DIM}   wishlist: ${user.wishlist.map((w) => w.name).join(", ")}${OFF}`);
      }
    }

    console.log(`  ${DIM}(password hashes are stored but deliberately not printed)${OFF}`);
  } else if (name === "builds") {
    const builds = await db
      .collection(name)
      .find({})
      .sort({ createdAt: -1 })
      .limit(25)
      .toArray();

    for (const build of builds) {
      console.log(
        `  ${String(build.code).padEnd(8)} ${(build.carName ?? "").padEnd(24)} ` +
        `Rs ${String(build.total ?? 0).padStart(7)}  ` +
        `${DIM}${build.owner ? "account" : "anonymous"}${OFF}`
      );
    }
  } else {
    const sample = await db.collection(name).find({}).limit(5).toArray();
    for (const doc of sample) {
      console.log(`  ${DIM}${JSON.stringify(doc).slice(0, 96)}${OFF}`);
    }
  }

  console.log();
}

await mongoose.disconnect();
