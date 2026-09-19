/**
 * Verifies every photograph in public/hero/ before it ships.
 *
 * The hero paints with `cover`, so a wrongly-shaped image does not look
 * broken — it silently crops, and what it crops away is usually the dish.
 * That is the kind of mistake nobody notices until it is live, which is why
 * this is a check you can run rather than a line in a README nobody reads
 * twice.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DIR = "public/hero";
const TARGET_ASPECT = 1.833;
const ASPECT_TOLERANCE = 0.03;
const MIN_WIDTH = 1600;
const MAX_KB = 400;

const files = fs
  .readdirSync(DIR)
  .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
  .filter((f) => !f.startsWith(".") && !f.startsWith("_"))
  .sort();

if (files.length === 0) {
  console.error(`No photographs in ${DIR}. The hero would fall back to one image.`);
  process.exit(1);
}

let failed = 0;
console.log(`${files.length} photograph${files.length === 1 ? "" : "s"} in the rotation:`);
console.log("");

for (const f of files) {
  const p = path.join(DIR, f);
  const m = await sharp(p).metadata();
  const kb = fs.statSync(p).size / 1024;
  const aspect = m.width / m.height;

  const problems = [];
  if (Math.abs(aspect - TARGET_ASPECT) > ASPECT_TOLERANCE) {
    problems.push(`aspect ${aspect.toFixed(3)}, wanted ~${TARGET_ASPECT} (it will crop)`);
  }
  if (m.width < MIN_WIDTH) problems.push(`${m.width}px wide, wanted ${MIN_WIDTH}+ (it will soften)`);
  if (kb > MAX_KB) problems.push(`${kb.toFixed(0)}KB, over ${MAX_KB}KB (re-encode at quality 82)`);
  if (m.format === "jpeg" && !m.isProgressive) problems.push("not progressive (it pops in rather than fading)");

  if (problems.length === 0) {
    console.log(`  ok    ${f.padEnd(22)} ${m.width}x${m.height}  ${kb.toFixed(0)}KB`);
  } else {
    failed++;
    console.log(`  FAIL  ${f.padEnd(22)} ${m.width}x${m.height}  ${kb.toFixed(0)}KB`);
    for (const x of problems) console.log(`        - ${x}`);
  }
}

console.log("");
if (failed > 0) {
  console.error(`${failed} photograph${failed === 1 ? "" : "s"} need attention. See ${DIR}/README.md.`);
  process.exit(1);
}
console.log("All good. Every photograph is the right shape, size and weight.");
