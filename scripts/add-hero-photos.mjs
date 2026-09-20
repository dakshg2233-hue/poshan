/**
 * Normalises any photograph into the shape public/hero/ requires.
 *
 * The folder is the rotation, so adding to it is meant to be trivial — but
 * "trivial" only held while the spec lived in a README and every new file
 * was hand-exported to match it. A rotation that grows one careful manual
 * export at a time does not grow. This does the export, so the only human
 * step left is choosing a good photograph.
 *
 *   npm run hero:add -- ~/Downloads/rajma.jpg ~/Downloads/idli.png
 *
 * The crop is attention-based rather than centred. Cropping to 1.83 from a
 * portrait or square source throws away most of the frame, and a centre
 * crop throws away whichever half the dish happens to sit in — the exact
 * failure hero/README.md warns about. sharp's attention strategy keeps the
 * busiest region, which for a plated dish on a table is the plate.
 *
 * Existing files are never silently replaced: a name already in the folder
 * is reported and skipped, because overwriting a shipped photograph also
 * quietly invalidates its row in ASSET-PROVENANCE.md.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DIR = "public/hero";
const TARGET_WIDTH = 2000;
/* The floor hero:check enforces, and the real requirement. Sources between
   this and TARGET_WIDTH are kept at their own width rather than refused:
   upscaling invents detail, but a genuine 1700px photograph is sharp at
   1700px and the spec has always said 1600 is enough. Demanding 2000 here
   while the README promised 1600 turned a documented minimum into a
   stricter undocumented one — which is how a generated image that met the
   spec got rejected for not meeting it. */
const MIN_WIDTH = 1600;
/* 1.833, matching hero:check. Derived rather than typed twice so the two
   scripts cannot drift into disagreeing about what the shape is. */
const TARGET_HEIGHT = Math.round(TARGET_WIDTH / 1.833);
const QUALITY = 82;

const inputs = process.argv.slice(2);

if (inputs.length === 0) {
  console.error("Usage: npm run hero:add -- <image> [image...]");
  console.error("");
  console.error("Each image is cropped to 1.83, resized to 2000px wide and");
  console.error(`written to ${DIR}/ as a progressive JPEG at quality ${QUALITY}.`);
  process.exit(1);
}

/** `Rajma Chawal (1).JPG` -> `rajma-chawal-1`, matching the naming note. */
function slugify(file) {
  return path
    .basename(file, path.extname(file))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

fs.mkdirSync(DIR, { recursive: true });

let added = 0;
let skipped = 0;

for (const input of inputs) {
  const name = `${slugify(input)}.jpg`;
  const out = path.join(DIR, name);

  if (!fs.existsSync(input)) {
    console.log(`  MISS  ${input} — no such file`);
    skipped++;
    continue;
  }

  if (fs.existsSync(out)) {
    console.log(`  SKIP  ${name} — already in the folder, delete it first to replace`);
    skipped++;
    continue;
  }

  try {
    const src = await sharp(input).metadata();
    if (src.width < MIN_WIDTH) {
      /* Upscaling invents detail the hero then shows at full size. Better
         to refuse than to ship something that softens on a large screen. */
      console.log(`  FAIL  ${name} — source is ${src.width}px wide, needs ${MIN_WIDTH}+`);
      skipped++;
      continue;
    }

    /* Never enlarge: a 1700px source becomes a 1700px hero, not a blurry
       2000px one. */
    const outWidth = Math.min(src.width, TARGET_WIDTH);
    const outHeight = Math.round(outWidth / 1.833);

    await sharp(input)
      .resize(outWidth, outHeight, {
        fit: "cover",
        position: sharp.strategy.attention,
      })
      .jpeg({ quality: QUALITY, progressive: true, mozjpeg: true })
      .toFile(out);

    const kb = fs.statSync(out).size / 1024;
    console.log(`  ok    ${name.padEnd(22)} ${outWidth}x${outHeight}  ${kb.toFixed(0)}KB`);
    added++;
  } catch (e) {
    console.log(`  FAIL  ${name} — ${e.message}`);
    skipped++;
  }
}

console.log("");
console.log(`${added} added, ${skipped} skipped.`);
if (added > 0) {
  console.log("");
  console.log("Next:");
  console.log("  1. npm run hero:check          verify the whole rotation");
  console.log("  2. record each new file in public/ASSET-PROVENANCE.md");
}
