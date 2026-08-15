# Poshan — पोषण

Indian nutrition and biomarker tracker. Body Mass Index read on **Asian-Indian
cutoffs**, meal plans built from food people actually cook, in Hindi and English.

```bash
npm run dev
```

Then open http://localhost:3000

---

## Why this project was scaffolded from scratch

The previous version of Poshan was a single self-contained `index.html` with
vanilla JavaScript (still at `~/poshan-website/index.html`). It had **no
`package.json`, no TypeScript, no Tailwind and no shadcn**, so the Spline
component could not be dropped into it — a React component needs a React
project. This app is that project.

If you ever need to reproduce the setup:

```bash
npx create-next-app@latest poshan-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

```bash
npx shadcn@latest init -d
```

```bash
npm install @splinetool/runtime @splinetool/react-spline framer-motion
```

Registry components are added with the CLI rather than pasted, so they match the
project's configured style:

```bash
npx shadcn@latest add card
```

## Component and style paths

`components.json` resolves `"ui": "@/components/ui"`, and because the project
uses `--src-dir`, that is **`src/components/ui`**. This is already the shadcn
default, so nothing had to be restructured.

Keeping registry components in `components/ui` matters because the shadcn CLI
writes and updates files at that exact alias. Put them anywhere else and
`npx shadcn@latest add <component>` will recreate the folder and you end up with
two copies of `button.tsx` drifting apart. It is also the boundary this codebase
relies on: `components/ui` holds generic, swappable primitives, while
`components/poshan` holds everything that knows what Poshan is.

| Path | Holds |
| --- | --- |
| `src/components/ui` | Registry + third-party primitives (`card`, `button`, `splite`, `spotlight`) |
| `src/components/poshan` | Poshan's own sections |
| `src/lib/poshan-data.ts` | Bands, plans, biomarkers, pricing, plan customiser |
| `src/app/globals.css` | Masala palette tokens, range input, motion |

## Two things you should change

**1. The Spline scene is a placeholder.** `src/components/poshan/scene-3d.tsx`
points at Spline's stock robot demo, which is what the integration brief
supplied. A robot next to the words "Turn the plate over" does not make sense
for a nutrition product. Build a thali scene in the Spline editor and replace
one constant:

```ts
const SCENE_URL = "https://prod.spline.design/<your-scene>/scene.splinecode";
```

**2. Meal imagery is vector art, not photography.** Generating photos needs
`GEMINI_API_KEY`, which is not set in this environment. Every dish in
`poshan-data.ts` already accepts a `photo` field, so real images drop in without
any layout change:

```ts
{ key: "dal", name: { en: "Dal", hi: "दाल" }, photo: "/meals/dal.jpg", ... }
```

## Design notes

- **Asian-Indian cutoffs** (ICMR / WHO Asia-Pacific): overweight starts at 23.0,
  not the European 25.0. This is the product's whole argument, so the thali rim
  is drawn as a scale with 18.5 / 23 / 25 marked on it.
- **Nutrients are always spelled out** — "Protein", "Carbohydrate", "Dietary
  Fibre", "Glycated Haemoglobin" — never bare abbreviations.
- **Fonts are self-hosted** through `next/font/google`: Tiro Devanagari Hindi
  (display, covers both scripts), Mukta (UI, by Ek Type in Mumbai), IBM Plex
  Mono (figures). No external font requests.
- **Motion**: CSS transitions, `IntersectionObserver` reveals and one
  `requestAnimationFrame` counter. Reduced motion is respected throughout, and
  the thali's 3D tilt is disabled for touch and for reduced-motion users.

## Checks

```bash
npx tsc --noEmit && npx eslint src && npm run build
```
