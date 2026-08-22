#!/usr/bin/env node
//
// Captures the screens for the brochure.
//
//   node tools/capture-screens.mjs
//
// Drives the Chrome that is already installed, in a real window rather than
// headless, because the whole site is WebGL and headless software rendering
// makes the cars look like something they are not.
//
// Everything is captured from localhost with all four services running, so the
// recommender, the valuation and the damage model return real answers rather
// than their error states.

import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SITE = "http://localhost:5173";
const OUT = path.join(process.cwd(), "..", "docs", "screenshots");

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The 3D takes a moment to load a model and fade it in, and a screenshot taken
// before that is a screenshot of an empty room.
const SETTLE = 5200;

const shots = [
  {
    file: "01-home-hero",
    path: "/",
    settle: 7000,
    note: "The landing page: the rotating car and the promise"
  },
  {
    file: "02-home-sections",
    path: "/",
    scroll: 900,
    note: "What the site does, five sections"
  },
  {
    file: "03-home-why",
    path: "/",
    scroll: 2100,
    note: "Why the project exists"
  },
  {
    file: "04-home-numbers",
    path: "/",
    scroll: 3000,
    note: "The measured numbers"
  },
  {
    file: "05-configurator",
    path: "/customise",
    settle: 8000,
    note: "The configurator, opened on the Assistant tab"
  },
  {
    file: "06-configurator-paint",
    path: "/customise",
    settle: 8000,
    click: "Paint",
    note: "Paint: colour, finish, surface calibration"
  },
  {
    file: "07-configurator-wheels",
    path: "/customise",
    settle: 8000,
    click: "Wheels",
    note: "Wheels, rim size, calipers, ride height"
  },
  {
    file: "08-configurator-body",
    path: "/customise",
    settle: 8000,
    click: "Body",
    note: "Spoiler, exhaust, wrap"
  },
  {
    file: "09-configurator-extras",
    path: "/customise",
    settle: 8000,
    click: "Extras",
    note: "Lights, underglow, tint, decals"
  },
  {
    file: "10-configurator-share",
    path: "/customise",
    settle: 8000,
    click: "Share",
    note: "AR and the shared garage"
  },
  {
    file: "11-discover",
    path: "/discover",
    settle: 3000,
    note: "The recommender's inputs"
  },
  {
    file: "12-value",
    path: "/value",
    settle: 4500,
    note: "Valuation"
  },
  {
    file: "13-identify",
    path: "/identify",
    settle: 3500,
    note: "Recognising a car from a photo"
  },
  {
    file: "14-repair",
    path: "/repair",
    settle: 3500,
    note: "Damage costing and resale impact"
  },
  {
    file: "15-account",
    path: "/account",
    settle: 2500,
    note: "Accounts"
  },
  {
    file: "16-home-mobile",
    path: "/",
    settle: 7000,
    phone: true,
    note: "The landing page on a phone"
  },
  {
    file: "17-configurator-mobile",
    path: "/customise",
    settle: 8000,
    phone: true,
    note: "The configurator on a phone"
  },
  {
    file: "18-menu-mobile",
    path: "/",
    settle: 4000,
    phone: true,
    openMenu: true,
    note: "The navigation drawer, every section explained"
  }
];

fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  defaultViewport: DESKTOP,
  args: ["--window-size=1460,1000", "--hide-scrollbars", "--force-device-scale-factor=1"]
});

const page = (await browser.pages())[0] ?? (await browser.newPage());

console.log();

for (const shot of shots) {
  await page.setViewport(shot.phone ? PHONE : DESKTOP);

  // domcontentloaded rather than networkidle: the configurator streams a
  // large model and never goes quiet enough for the idle heuristics, so the
  // settle below is what decides when the shot is taken.
  await page.goto(SITE + shot.path, { waitUntil: "domcontentloaded", timeout: 60000 });
  await wait(shot.settle ?? SETTLE);

  if (shot.click) {
    // The tab strip is plain buttons, found by their text rather than by a
    // selector that would break the moment the panel is restyled.
    const clicked = await page.evaluate((label) => {
      const button = [...document.querySelectorAll("button")].find(
        (element) => element.textContent.trim() === label
      );
      if (!button) return false;
      button.click();
      return true;
    }, shot.click);

    if (!clicked) console.log(`  ! could not find the ${shot.click} tab`);
    await wait(900);
  }

  if (shot.openMenu) {
    await page.evaluate(() => {
      document.querySelector("header button[aria-label]")?.click();
    });
    await wait(800);
  }

  if (shot.scroll) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), shot.scroll);
    // Long enough for the scroll reveals to finish, or half the section
    // arrives at fifty percent opacity.
    await wait(1400);
  }

  const file = path.join(OUT, `${shot.file}.png`);
  await page.screenshot({ path: file, type: "png" });

  const size = (fs.statSync(file).size / 1024).toFixed(0);
  console.log(`  ${shot.file.padEnd(26)} ${String(size).padStart(5)} KB   ${shot.note}`);
}

await browser.close();

console.log(`\n  ${shots.length} screens written to ${OUT}\n`);
