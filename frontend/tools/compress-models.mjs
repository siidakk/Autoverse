#!/usr/bin/env node
//
// Shrinks car models with meshopt compression, which react-three-drei already
// decodes out of the box — no CDN and no extra runtime code.
//
//   npm run compress:models
//   node tools/compress-models.mjs public/models/some-car.glb
//
// Geometry is quantised, not simplified, so wheel and spoiler detection see
// exactly the same car afterwards. Originals are kept alongside as .orig.glb
// unless --replace is passed.

import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, prune, dedup } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const OFF = "\x1b[0m";

const args = process.argv.slice(2);
const replace = args.includes("--replace");
const targets = args.filter((arg) => !arg.startsWith("--"));

if (!targets.length) {
  console.log("usage: node tools/compress-models.mjs <file-or-directory> [--replace]");
  process.exit(1);
}

const files = targets.flatMap((target) => {
  if (!fs.existsSync(target)) {
    console.log(`${RED}missing${OFF} ${target}`);
    return [];
  }

  return fs.statSync(target).isDirectory()
    ? fs.readdirSync(target)
        .filter((entry) => entry.toLowerCase().endsWith(".glb"))
        .filter((entry) => !entry.endsWith(".orig.glb"))
        .map((entry) => path.join(target, entry))
    : [target];
});

await MeshoptEncoder.ready;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.encoder": MeshoptEncoder
});

const mb = (bytes) => bytes / 1048576;

let before = 0;
let after = 0;

console.log();

for (const file of files) {
  const name = path.basename(file);
  const originalSize = fs.statSync(file).size;

  try {
    const document = await io.read(file);

    await document.transform(
      dedup(),
      prune(),
      meshopt({ encoder: MeshoptEncoder, level: "high" })
    );

    const output = await io.writeBinary(document);

    if (!replace) {
      const backup = file.replace(/\.glb$/i, ".orig.glb");
      if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
    }

    fs.writeFileSync(file, output);

    before += originalSize;
    after += output.byteLength;

    const saved = 100 - (output.byteLength / originalSize) * 100;
    console.log(
      `${GREEN}done${OFF} ${name} ${DIM}${mb(originalSize).toFixed(1)} MB →${OFF} ` +
      `${mb(output.byteLength).toFixed(1)} MB ${DIM}(-${saved.toFixed(0)}%)${OFF}`
    );
  } catch (error) {
    console.log(`${RED}fail${OFF} ${name}\n     ${error.message}`);
  }
}

if (before) {
  console.log(
    `\n${GREEN}total${OFF} ${mb(before).toFixed(1)} MB → ${mb(after).toFixed(1)} MB ` +
    `${DIM}(-${(100 - (after / before) * 100).toFixed(0)}%)${OFF}\n`
  );
  console.log(`${DIM}Re-run the validator to confirm nothing changed geometrically.${OFF}\n`);
}
