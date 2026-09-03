#!/usr/bin/env node
//
// Renders the garage's fifteen cars into training data.
//
//   npm run dev              (in another terminal)
//   node tools/render-garage.mjs [--per 260]
//
// Writes ml/data/garage/<car id>/<n>.jpg.
//
// Drives the Chrome that is already installed, in a real window rather than
// headless, for the same reason capture-screens.mjs does: this is all WebGL,
// and headless software rendering produces something that is not what the
// models look like. Training on that would be training on the wrong thing.
//
// The work happens in render-garage.html; this only says which car, how many,
// and where to put them.

import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PAGE = "http://localhost:5173/tools/render-garage.html";
const OUT = path.join(process.cwd(), "..", "ml", "data", "garage");

const perCar = Number(
  (process.argv.find((argument) => argument.startsWith("--per=")) ?? "").split("=")[1] ?? 260
);

// Read straight out of the app's own car list, so this cannot drift from what
// the configurator actually offers.
const source = fs.readFileSync(path.join(process.cwd(), "src", "data", "cars.js"), "utf8");

const names = [...source.matchAll(/name:\s*"([^"]+)"/g)].map((m) => m[1]);
const models = [...source.matchAll(/model:\s*"([^"]+)"/g)].map((m) => m[1]);

if (names.length !== models.length || !names.length) {
  console.error("Could not read the car list out of src/data/cars.js");
  process.exit(1);
}

// A folder name that survives a filesystem and reads back cleanly.
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  args: ["--window-size=520,700", "--use-angle=default"]
});

const page = await browser.newPage();
await page.setViewport({ width: 480, height: 640 });

page.on("pageerror", (error) => console.error("  page error:", error.message));

await page.goto(PAGE, { waitUntil: "networkidle2", timeout: 120000 });
await page.waitForFunction("window.rendererReady === true", { timeout: 120000 });

console.log(`\n  Rendering ${perCar} frames each for ${names.length} cars\n`);

let total = 0;

for (let index = 0; index < names.length; index += 1) {
  const name = names[index];
  const folder = path.join(OUT, slug(name));
  fs.mkdirSync(folder, { recursive: true });

  process.stdout.write(`  ${name.padEnd(26)}`);

  try {
    await page.evaluate((url) => window.loadCar(url), models[index]);
  } catch (error) {
    console.log(`FAILED to load (${error.message.slice(0, 60)})`);
    continue;
  }

  // A moment for textures to finish decoding, or the first few frames come
  // out untextured and teach the classifier something that is not true.
  await wait(1200);

  let written = 0;
  for (let frame = 0; frame < perCar; frame += 1) {
    const dataUrl = await page.evaluate(() => window.shoot());
    const body = Buffer.from(dataUrl.split(",")[1], "base64");
    fs.writeFileSync(path.join(folder, `${String(frame).padStart(4, "0")}.jpg`), body);
    written += 1;
  }

  total += written;
  console.log(`${written} frames`);
}

console.log(`\n  ${total} images under ${OUT}\n`);

await browser.close();
