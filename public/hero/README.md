# Hero photographs

Every image in this folder is in the landing page's rotation. One is picked
at random on each visit.

**To add one: drop the file in here.** There is no list to edit — the folder
*is* the list, read at build time by `src/lib/hero-photos.server.ts`.

## What a photograph has to be

- **Vegetarian.** This is the only hard content rule.
- **1.83 aspect** (roughly 16:8.7) — e.g. 2000×1091 or 1600×872. The hero
  paints with `background-size: cover`, so a different aspect will not
  distort, it will crop, and the crop may lose the part of the dish that
  made the photograph worth using.
- **At least 1600px wide**, so it stays sharp on a large screen.
- **Progressive JPEG, quality ~82.** Matches the rest and roughly halves the
  file against an unoptimised export.

Run `npm run hero:check` to verify all of that before committing.

## Compressing a new photograph

```
npx sharp-cli --input new.jpg --output public/hero/new.jpg \
  resize 2000 --withoutEnlargement jpeg --quality 82 --progressive
```

Or open it in any editor and export progressive JPEG at quality 82.

## Naming

Lowercase, hyphenated, named for the dish: `rajma-chawal.jpg`,
`idli-sambar.jpg`. A file starting with `_` or `.` is skipped, which is how
to park one in the folder without shipping it.

## Provenance

Every image here must be recorded in `public/ASSET-PROVENANCE.md` before it
ships. That file is what a copyright inquiry or a due-diligence review asks
for first.
