#!/usr/bin/env node
//
// Prints the two values the hosted API needs, ready to paste into Render.
//
//   npm run render:env
//
// The Atlas connection string is read from backend/.env at the moment you run
// this. Nothing is written anywhere and no secret is stored in this file, so it
// is safe in the repository while the string it prints is not.
//
// Background: the hosted service had no MONGO_URI at all, which is why sign-up
// failed. The cluster, the user, the password and the IP allowlist were all
// fine the whole time.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const SIGNAL = "\x1b[33m";
const DIM = "\x1b[2m";
const OFF = "\x1b[0m";

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(here, "..", ".env");

if (!fs.existsSync(envPath)) {
  console.error("\n  No backend/.env to read a connection string out of.\n");
  process.exit(1);
}

const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

// Either the live setting or the commented-out Atlas one, whichever points at
// a cluster rather than at this machine.
const candidates = lines
  .map((line) => line.replace(/^#\s*/, "").trim())
  .filter((line) => /^(OLD_)?MONGO_URI=/.test(line))
  .map((line) => line.replace(/^(OLD_)?MONGO_URI=/, "").trim())
  .filter((uri) => uri.startsWith("mongodb+srv://"));

if (!candidates.length) {
  console.error(
    "\n  backend/.env has no Atlas string in it, only a local one.\n" +
    "  Copy a fresh string from Atlas: Clusters -> Connect -> Drivers.\n"
  );
  process.exit(1);
}

let uri = candidates[0];

// A half-deleted placeholder got glued onto appName at some point. Harmless as
// a label, but there is no reason to carry it into a new setting.
uri = uri.replace("OUR_MONGODB_CONNECTION_STRING", "");

// Name the database explicitly. Without a path Mongo quietly uses one called
// "test", which works but is a confusing place to find your accounts later.
// Only add the options that are not already there, or a string that came with
// them ends up carrying each one twice.
const defaults = ["retryWrites=true", "w=majority"];

if (/mongodb\.net\/\?/.test(uri)) {
  const missing = defaults.filter((option) => !uri.includes(option.split("=")[0] + "="));
  uri = uri.replace("mongodb.net/?", `mongodb.net/autoverse?${missing.map((o) => o + "&").join("")}`);
} else if (/mongodb\.net\/?$/.test(uri)) {
  uri = uri.replace(/mongodb\.net\/?$/, `mongodb.net/autoverse?${defaults.join("&")}`);
}

const secret = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

console.log(`
  ${SIGNAL}Render${OFF}  dashboard.render.com  ->  ${SIGNAL}autoverse-api-3iou${OFF}  ->  Environment
  ${DIM}Add Environment Variable, twice, then Save changes.${OFF}

  ${SIGNAL}MONGO_URI${OFF}
  ${uri}

  ${SIGNAL}JWT_SECRET${OFF}
  ${secret}

  ${DIM}Then open https://autoverse-api-3iou.onrender.com/health and look for${OFF}
  ${DIM}"accountsWork": true${OFF}

  ${DIM}The first value contains your database password. Do not paste it${OFF}
  ${DIM}anywhere public, and do not commit it.${OFF}
`);
