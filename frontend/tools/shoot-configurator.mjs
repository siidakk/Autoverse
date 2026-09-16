// Screenshot the configurator with a given car and a given set of parts fitted.
//
//   node tools/shoot-configurator.mjs --car=3 --spoiler=racing --exhaust=quad --headlights=xenon
//
// The Browser pane cannot screenshot the WebGL canvas reliably, and "the parts
// sit in the wrong place" is not a thing arithmetic alone settles -- you have
// to look at the car.

import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const arg = (name, fallback) =>
  (process.argv.find((a) => a.startsWith(`--${name}=`)) ?? "").split("=")[1] ?? fallback;

const car = arg("car", "3");
const out = arg("out", path.join(process.cwd(), "..", "shots"));
const views = arg("views", "3/4,side,rear,front").split(",");
const tag = arg("tag", "");

fs.mkdirSync(out, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--use-angle=default", "--enable-unsafe-swiftshader", "--window-size=1500,950"]
});

const page = await browser.newPage();
await page.setViewport({ width: 1500, height: 950 });
page.on("pageerror", (e) => console.error("  page error:", e.message));

await page.goto(`http://localhost:5173/customise?car=${car}`, {
  waitUntil: "networkidle2",
  timeout: 180000
});

await wait(12000);

// Options read "Xenon  Cool white  +Rs6,500", so the match is a prefix of the
// whole label rather than an exact string.
const click = async (text) => {
  const done = await page.evaluate((want) => {
    const label = (el) => (el.innerText || el.textContent || "").trim().toLowerCase();
    const nodes = [...document.querySelectorAll("button, a")];
    const hit =
      nodes.find((b) => label(b) === want) ||
      nodes.find((b) => label(b).startsWith(want));
    if (hit) { hit.click(); return true; }
    return false;
  }, text.toLowerCase());
  await wait(1000);
  return done;
};

for (const [tab, option] of [
  ["Body", arg("spoiler", "")],
  ["Body", arg("exhaust", "")],
  ["Extras", arg("headlights", "")]
]) {
  if (!option) continue;
  await click(tab);
  const ok = await click(option);
  console.log(`  ${tab} -> ${option}: ${ok ? "set" : "NOT FOUND"}`);
}

await wait(2500);

for (const view of views) {
  const ok = await click(view);
  await wait(2200);
  const file = path.join(out, `car${car}${tag ? "-" + tag : ""}-${view.replace("/", "-")}.png`);
  await page.screenshot({ path: file });
  console.log(`  ${view}: ${ok ? "" : "(view button missing) "}${file}`);
}

await browser.close();
