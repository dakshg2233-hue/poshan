# Poshan — Complete Project Guide

**Last Updated:** 2026-08-22  
**Project:** Nutrition tool for Asian-Indian BMI and meal planning  
**Stack:** Next.js 16.3.1, React 19.2.8, Turbopack, Tailwind CSS v4, Supabase, Razorpay  

---

## 1. Project Overview

**Poshan** ("nutrition" in Hindi) is a web app that:
- Reads your height/weight against **Asian-Indian BMI cutoffs** (different from WHO standards)
- Suggests customized meal plans based on BMI band, goal, diet (veg/non-veg), and region
- Shows portion sizes in a visual thali (Indian plate)
- Allows you to scan food photos to estimate calories
- Tracks biomarkers (blood pressure, blood sugar, cholesterol)
- Offers paid subscription for personalized meal library and clinic partnerships

**Key insight:** This is a **nutrition tool**, not medical advice. It does not diagnose or treat. It reads your BMI and suggests home-cooked Indian meals.

---

## 2. Tech Stack

| Layer | Tech | Notes |
|-------|------|-------|
| **Frontend** | Next.js 16.3.1, React 19.2.8 | `npm run dev` runs on port 3000 |
| **Build** | Turbopack | Much faster than Webpack |
| **Styling** | Tailwind CSS v4, custom CSS | No pre-built component library; built from scratch |
| **Database** | Supabase (PostgreSQL) | Row-level security (RLS), realtime subscriptions |
| **Auth** | Supabase email OTP | No passwords; sign in with one-time code |
| **Payments** | Razorpay | Handles checkout and subscription management |
| **Images/Video** | Self-hosted + Next.js Image | No external CDN (CSP blocks it) |
| **Fonts** | Self-hosted via next/font | Instrument Serif (display), DM Sans (UI), IBM Plex Mono (data) |
| **Vision/Scan** | Anthropic Messages API (Claude Haiku) | Analyzes meal photos to estimate calories |
| **Deployment** | Vercel (assumed) | Can deploy anywhere that runs Node |

---

## 3. File Structure

```
poshan-app/
├── src/
│   ├── app/                           # Next.js app directory
│   │   ├── layout.tsx                 # Root layout, fonts, global setup
│   │   ├── page.tsx                   # Home page
│   │   ├── globals.css                # ALL colour tokens, palettes, glass, animations
│   │   ├── not-found.tsx              # 404 page
│   │   ├── robots.ts                  # SEO robots directive
│   │   ├── sitemap.ts                 # SEO sitemap
│   │   ├── icon.tsx, apple-icon.tsx   # Favicons
│   │   ├── loading.tsx                # Route-level loading state
│   │   ├── login/
│   │   │   ├── page.tsx               # Email OTP sign-in
│   │   │   └── layout.tsx             # Per-page metadata
│   │   ├── dashboard/
│   │   │   ├── page.tsx               # Saved profile + biomarkers
│   │   │   └── layout.tsx
│   │   ├── profile/
│   │   │   ├── page.tsx               # Edit height, weight, goal, diet, region
│   │   │   └── layout.tsx
│   │   ├── thank-you/
│   │   │   └── page.tsx               # Post-checkout confirmation
│   │   ├── privacy/
│   │   │   └── page.tsx               # Privacy policy
│   │   ├── terms/
│   │   │   └── page.tsx               # Terms of service
│   │   └── api/
│   │       ├── scan/route.ts          # Meal photo vision API (Claude Haiku)
│   │       ├── profile/route.ts       # GET/PATCH user profile
│   │       └── storage/avatar/        # (unused, can delete)
│   │
│   ├── components/
│   │   ├── poshan/
│   │   │   ├── poshan-app.tsx         # Root component, state wiring, layout
│   │   │   ├── hero-video.tsx         # Hero: dark botanical still-life, spotlight, glass nav
│   │   │   ├── hero-cinematic.tsx     # Previous photographic hero (kept for swap)
│   │   │   ├── hero.tsx               # BMI input tool (the core)
│   │   │   ├── thali.tsx              # SVG thali (plate) — CURRENTLY RENDERED
│   │   │   ├── thali-3d.tsx           # 3D interactive thali (written, NOT mounted)
│   │   │   ├── dish-art.tsx           # Meal photos (structure in place, no photos yet)
│   │   │   ├── meal-library.tsx       # 38 meal cards, filters, recipes
│   │   │   ├── food-scanner.tsx       # Camera + vision API integration
│   │   │   ├── conditions.tsx         # Health conditions picker
│   │   │   ├── premium.tsx            # Pricing, diet+region selector
│   │   │   ├── clinics.tsx            # B2B clinic partnerships
│   │   │   ├── nav.tsx                # Top navigation
│   │   │   ├── sections.tsx           # Bands, Meals, Biomarkers, etc.
│   │   │   ├── cursor-picker.tsx      # 9 food cursor selector (dev tool, hidden)
│   │   │   ├── palette-control.tsx    # Palette switcher (dev tool, hidden)
│   │   │   ├── palette-switcher.tsx   # 10 palette definitions
│   │   │   ├── lang-provider.tsx      # Hindi/English toggle
│   │   │   ├── pointer-light.tsx      # Pointer spotlight across full page
│   │   │   ├── motion-layer.tsx       # Count-up numbers, card tilt, scroll progress
│   │   │   ├── consent.tsx            # Cookie banner + consent-gated analytics
│   │   │   ├── sticky-cta.tsx         # Mobile CTA below hero
│   │   │   └── glass-filter.tsx       # SVG filter defs for glass effect
│   │   │
│   │   └── ui/
│   │       ├── glass-filter.tsx       # Reusable glass effect filters
│   │       ├── magnetic-cursor.tsx    # Custom cursor (ladoo food cursor)
│   │       ├── masked-heading.tsx     # Text with animated mask reveal
│   │       └── button.tsx             # (unused, can delete)
│   │
│   ├── lib/
│   │   ├── poshan-data.ts             # 38 meals, 10 BMI bands, meal plans
│   │   ├── use-body-profile.ts        # Core state: height, weight, goal, etc.
│   │   ├── hooks/
│   │   │   ├── use-profile.ts         # Fetch/sync signed-in user profile
│   │   │   ├── use-conditions.ts      # Fetch/sync user health conditions
│   │   │   ├── use-biomarkers.ts      # Fetch/sync user biomarkers
│   │   │   └── (other hooks)
│   │   └── supabase.ts                # Client & server auth
│   │
│   └── styles/ (if any global CSS beyond globals.css)
│
├── supabase/
│   ├── migrations/                    # Postgres schema migrations
│   ├── functions/
│   │   ├── verify-payment/index.ts    # Razorpay signature verification (NOT DEPLOYED)
│   │   └── notify-biomarker/          # Biomarker alerts (NOT DEPLOYED)
│   └── schema.sql                     # Current schema snapshot
│
├── public/
│   ├── thali-hero.jpg                 # Background image for hero + 404
│   └── (other assets)
│
├── docs/
│   ├── design-quiet-vitality.md       # Original design spec
│   └── (other docs)
│
├── .next/                             # Build output (git-ignored)
├── node_modules/                      # Dependencies (git-ignored)
├── .env.example                       # Environment variable template
├── .env.local                         # LIVE KEYS (git-ignored, DO NOT COMMIT)
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── SESSION_NOTES.md                   # This session's work
└── POSHAN_COMPLETE_GUIDE.md           # This file
```

---

## 4. Design System

### 4.1 Colours & Palettes

**10 named palettes**, each with a light-mode ground and dark accents:

| Name | Ground | Brand 1 | Brand 2 | Use Case |
|------|--------|---------|---------|----------|
| **Sindoor** (default) | #FDFBFA | #C2410C (vermilion) | #EEAA3C (saffron) | Warmest, most appetising |
| **Seed** | #FCFCF7 | #1C3A13 (forest green) | #D3FA99 (lime) | Botanical-clinical |
| **Kaali** | #0E0E0E | #FF8A5B (coral) | #F0B055 (warm gold) | Dark mode hero |
| **Patta** | #090A09 | #8FBF72 (Poshan Leaf) | #D8C98A (khaki) | Charcoal + green |
| **Neel** | #FAFBFD | #1E40AF (indigo) | #E0A52A (warm gold) | Coolest, clinical |
| **Madhu** | #FDFAFB | #9D2449 (wine) | #C79A5E (tan) | Expensive-looking |
| **Tulsi** | #FAFCFA | #1F6B45 (basil green) | #D9A52C (warm gold) | Healthy & calm |
| **Kesari** | #FEFCF8 | #B45309 (saffron) | #0F766E (teal) | Warm + cool tension |
| **Kaajal** | #FBFBFB | #B3311A (red) | #8A8A8A (grey) | Photography-first |
| **Jamun** | #FCFAFD | #6B21A8 (plum) | #D9A52C (warm gold) | Distinctive & bold |

**Token hierarchy** in `src/app/globals.css`:

```css
:root {
  --brand-1: /* primary accent (vermilion, green, etc.) */
  --brand-2: /* secondary accent (gold, teal, etc.) */
  
  --roti:     /* light ground */
  --roti-2:   /* slightly warmer ground */
  --ink:      /* text/foreground */
  --ink-soft: /* secondary text */
  --line:     /* borders */
  --steel:    /* subtle elements */
  --steel-lo: /* even more subtle */
  
  --kesar:    /* action/link colour */
  --kesar-fill: /* filled button background */
  
  --mirch:    /* error/alert */
  --elaichi:  /* success/positive */
  
  --surface:  /* card background */
  --panel:    /* elevated panel */
  --panel-ink: /* text in panel */
}

/* Applied per-palette */
[data-palette="seed"] { --brand-1: #1C3A13; /* etc. */ }
```

**Dark mode** uses `prefers-color-scheme: dark` media query.

### 4.2 Typography

| Font | Use | Size | Weight |
|------|-----|------|--------|
| **Instrument Serif** (self-hosted) | Hero wordmark, display headings | clamp(4rem, 17vw, 15rem) | 400 (italic) |
| **DM Sans** (self-hosted) | UI buttons, labels, nav | 12–20px | 400–600 |
| **IBM Plex Mono** (self-hosted) | Biomarker data, monospace | 12–16px | 400–600 |

Imported via `next/font` in `src/app/layout.tsx` — no external requests, CSP-safe.

### 4.3 Glass Effects

`.liquid-glass` family (in `globals.css`):

```css
.liquid-glass           /* card-like glass (translucent, frosted) */
.liquid-glass-chrome    /* nav/floating UI (more opaque) */
.glass-orbit            /* food inside glass (circular orbit) */
.glass-mark             /* food marks (nav food icons) */
.glass-near|mid|far     /* food depth cues (size, blur, opacity) */
```

Uses `background: linear-gradient(...transparent...) + backdrop-filter: blur()` — works on all modern browsers.

### 4.4 Spacing & Layout

- **Gap:** 16px (default), 44px (hero sections)
- **Padding:** 24px (cards), 16px (mobile)
- **Breakpoints:** Tailwind defaults (640px = mobile, 1024px = desktop)
- **Grid:** Hero uses `grid-cols-[1fr_auto_1fr]` for brand / pill / CTA

---

## 5. Architecture & Data Flow

### 5.1 State Management

```
┌─ PoshanApp (root)
│  └─ useBodySource() → resolves localStorage + Supabase auth
│     └─ PoshanAppInner
│        ├─ useBodyState() → height, weight, goal, diet, region
│        │  ├─ Hero → height/weight inputs
│        │  ├─ Conditions → health conditions picker
│        │  ├─ Premium → diet/region/goal selector
│        │  └─ (all values persist via use-body-profile)
│        │
│        └─ LangProvider → language (हिं / en)
```

**Key:** State lives in `use-body-profile.ts`, which:
- Reads from localStorage on first load (unsigned-out users)
- Syncs to Supabase `profiles` table when signed in
- Debounces writes (~600ms) so sliders don't hammer the API

### 5.2 Authentication

**Supabase email OTP:**
1. User enters email on `/login`
2. Supabase sends one-time code to email
3. User enters code, verified, session created
4. Redirect to `/dashboard` or home
5. Sign out clears session, reverts to localhost state

**RLS (Row-Level Security):**
- `profiles` table: each user sees only their own row
- `user_conditions` table: each user sees only their own conditions
- `biomarkers` table: each user sees only their own biomarkers

No user can query another user's data at the database level.

### 5.3 Data Schema

**Core tables:**

```sql
profiles (
  id: uuid (user_id),
  height_cm: int,
  weight_kg: int,
  goal: enum (loss|maintenance|gain),
  diet: enum (veg|nonveg),
  region: enum (north|south|east|west|central),
  lang: enum (en|hi),
  created_at, updated_at
)

user_conditions (
  id: uuid,
  user_id: uuid,
  condition: enum (diabetes|hypertension|...),
  active: boolean,
  created_at
)

biomarkers (
  id: uuid,
  user_id: uuid,
  type: enum (bp_systolic|bp_diastolic|blood_sugar|cholesterol|...),
  value: float,
  measured_at: timestamp
)
```

### 5.4 API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/profile` | GET | Fetch signed-in user profile |
| `/api/profile` | PATCH | Update profile (height, weight, goal, etc.) |
| `/api/scan` | POST | Send meal photo to Claude Haiku, get calories |

**Authentication:** All routes check `getUser()` and return 401 if unsigned.

---

## 6. Pages & Routes

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Home (renders `PoshanApp`) |
| `/login` | `login/page.tsx` | Email OTP sign-in |
| `/dashboard` | `dashboard/page.tsx` | Signed-in profile + biomarkers readout |
| `/profile` | `profile/page.tsx` | Edit height, weight, goal, diet, region |
| `/thank-you` | `thank-you/page.tsx` | Post-checkout confirmation |
| `/privacy` | `privacy/page.tsx` | Privacy policy (marked `[TO CONFIRM]` items) |
| `/terms` | `terms/page.tsx` | Terms of service |
| `/404` | `not-found.tsx` | Error page (auto-triggered) |

---

## 7. Components Deep Dive

### 7.1 Hero (`hero-video.tsx`)

**The landing section.** Specs:
- 100dvh dark still-life (thali photograph)
- Instrument Serif wordmark (4rem–15rem, italic)
- "YOUR DAILY NUTRITION RITUAL" eyebrow + green dot
- "Nourishment, in your rhythm — consciously made." subline
- Frosted glass nav pill (5 labels: Meal plans, Biomarkers, Pricing, For clinics)
- Top-right green CTA "Find your blend" with northeast arrow
- Mobile hamburger menu → fullscreen dark overlay with staggered entries
- Pointer spotlight (260px radius) that reveals a motion layer on hover/move
- Grid parallax (~16px travel based on pointer position)

**Key CSS:**
- `.liquid-glass-chrome` for nav pill
- Canvas-drawn radial mask for spotlight
- `requestAnimationFrame` with 0.1 lerp for smooth tracking

### 7.2 Hero (BMI Tool) (`hero.tsx`)

**The second hero section.** The actual interaction:
- Height slider (100–220cm)
- Weight slider (30–150kg)
- Displays BMI, band name (Underweight/Normal/Overweight/Obese), and recommended goal
- Shows thali with portions matched to BMI band
- Button: "See my thali" scrolls to thali section

### 7.3 Thali (`thali.tsx`)

**SVG plate showing portions.**
- Rendered as an SVG with named katoris: rice, dal, sabzi, curd, roti
- Portions opacity/size scale based on BMI band
- Redrawn rice (lumpy contour + grain strokes, not smooth dome)
- Ready to be replaced with interactive version (`thali-3d.tsx`)

### 7.4 Meal Library (`meal-library.tsx`)

**38 meal cards** with:
- Filter by meal type (breakfast, lunch, dinner, snack)
- Filter by nutrition (high-protein, low-fat, etc.)
- Each card shows: image placeholder, name, kcal, macros, veg/non-veg mark
- Tap to expand: full recipe, micronutrients, cooking instructions

### 7.5 Food Scanner (`food-scanner.tsx`)

**Camera + vision integration:**
- Open camera on mobile
- Capture photo
- Send to `/api/scan` (Claude Haiku analyzes it)
- Returns: estimated items, calories, macros
- User can adjust portions/items, add to log

**Note:** Uses `VISION_API_KEY` (Anthropic) — set in `.env.local`.

### 7.6 Conditions (`conditions.tsx`)

**Health conditions picker:**
- Checkboxes for: diabetes, hypertension, thyroid, PCOS, etc.
- Saves to `user_conditions` table
- Used to show relevant nutrition tips

### 7.7 Premium/Pricing (`premium.tsx`)

**Paid subscription + customization:**
- Razorpay checkout button
- Diet selector: veg / non-veg
- Region selector: north / south / east / west / central
- Shows what user gets: expanded meal library, clinic partnerships, biomarker tracking

### 7.8 Pointer Light (`pointer-light.tsx`)

**Full-page spotlight effect:**
- Follows pointer with 0.1 lerp smoothing (same as hero)
- Detects background luminance under pointer
- Switches blend mode: `screen` (lighten) on dark bands, `multiply` on cream bands
- Respects `prefers-reduced-motion`

### 7.9 Consent (`consent.tsx`)

**Cookie banner:**
- Consent-first: nothing loads until accepted
- "Decline" is a real choice, changes nothing about the app
- On "Accept": loads Google Analytics (IP anonymised, no ad signals)
- Stores choice in localStorage

### 7.10 Sticky CTA (`sticky-cta.tsx`)

**Mobile-only fixed button:**
- Appears once hero scrolls out of view
- Disappears near footer (never stacks with banner)
- Links to `#check` (the "See my thali" button)

---

## 8. Known Issues & Gaps

### Not Implemented

1. **Interactive thali** — `thali-3d.tsx` exists but is NOT mounted. The SVG version (`thali.tsx`) renders instead.
   - Work needed: Photo base + six perspective-fitted overlay fills that respond to drag
   - Connected to use-body-profile for persistence

2. **Meal photos** — 38 cards have a photo slot (`dish-art.tsx`), but no images exist yet.
   - Files needed: `~/Downloads/poshan-meals/` (currently empty)
   - Schema change: `Dish` object instead of `DishKey` to carry photos

3. **Edge functions not deployed:**
   - `supabase/functions/verify-payment/index.ts` — Razorpay signature check (reads keys from client, NOT SECURE)
   - `supabase/functions/notify-biomarker/index.ts` — Alerts on biomarker changes (only logs, doesn't send)

4. **No tests** — zero test coverage. Many bugs fixed (data loss on `/profile`, broken build) that a single test would have caught.

5. **Scanner default** — `src/app/api/scan/route.ts` still defaults to `http://localhost:20128` (OmniRoute), not Anthropic.

6. **Palette persistence** — palette switcher is a dev tool, currently shipping to real visitors. Once a palette is chosen, delete the switcher and bake it into `:root`.

### Bugs Fixed This Session

- Rice was a smooth blob, now reads as grain (lumpy contour + strokes)
- Hero overlays too dark, food invisible → lifted opacity, added text-only scrim
- Dev tools (cursor picker, palette control) visible on page → commented out
- Nav centered with "Ritual" labels → moved right, renamed to conventional headings

### Limitations

- **CSP blocks external:** No CloudFront video, no Figma fonts, no external image hosts
  - Substituted: thali-hero.jpg, IBM Plex Mono, local fonts
- **Signatory data layer not wired:** backend exists, but `PoshanApp` never calls auth hooks
  - Profile, conditions, language don't persist across refresh unless signed in
- **Dark mode incomplete:** Sindoor palette has only light variant; dark mode needs its own pass
- **Mobile nav glitchy on some devices:** hamburger menu works, but transition could be smoother

---

## 9. Common Workflows

### 9.1 Add a New Meal

1. Open `src/lib/poshan-data.ts`
2. Add to `MEALS` array:
   ```ts
   {
     id: "new-meal-id",
     en: "English name",
     hi: "हिंदी नाम",
     kcal: 250,
     protein: 10,
     carbs: 40,
     fat: 5,
     veg: true,
     category: "breakfast",
     photo: undefined, // when photo exists
   }
   ```
3. Add to one or more meal plans in `PLANS`
4. Test: should appear in meal library + recommendations

### 9.2 Change a Colour

1. Open `src/app/globals.css`
2. Find the palette block (e.g., `:root[data-palette="sindoor"]`)
3. Update the token (e.g., `--brand-1: #newcolor`)
4. Save, reload — should apply site-wide

### 9.3 Add a Health Condition

1. Add to `ConditionKey` enum in `src/lib/poshan-data.ts`
2. Add the condition name to `CONDITIONS` array
3. Update the Supabase `user_conditions` enum to match
4. Should appear in the conditions picker

### 9.4 Fix a Page's Layout

1. Identify which component is rendering it (e.g., `premium.tsx`)
2. Check for inline `style={{...}}` — often hidden from CSS classes
3. Look in `globals.css` for relevant `.class` definitions
4. Edit CSS (not Tailwind classes alone) for most reliable changes
5. Reload, verify on both desktop (1280px) and mobile (375px)

### 9.5 Wire a New Data Field to Persistence

1. Add column to Supabase schema: `ALTER TABLE profiles ADD COLUMN new_field TYPE`
2. Update TypeScript type in `src/lib/use-body-profile.ts`
3. In the component that reads/writes it, call the hook: `const { profile, updateProfile } = useProfile()`
4. Update `.update()` call to include the new field
5. Test: sign in, change field, reload → should persist

### 9.6 Deploy (Vercel)

1. Push to GitHub (main branch, or create PR)
2. Vercel auto-deploys
3. Check: `.env` vars are set in Vercel dashboard (SUPABASE_URL, VISION_API_KEY, etc.)
4. Run `npm run build` locally first to catch errors

---

## 10. Environment Variables

Create `.env.local` in the root (git-ignored):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Vision API (meal scanner)
VISION_API_KEY=sk-ant-...
VISION_BASE_URL=https://api.anthropic.com
VISION_MODEL=claude-haiku-4-5-20251001

# Razorpay (payments)
RAZORPAY_KEY_SECRET=your-secret-key
RAZORPAY_KEY_ID=your-key-id

# Analytics (optional)
NEXT_PUBLIC_ANALYTICS_ID=G-your-ga-id
```

**Do NOT commit `.env.local`** — it contains live keys.

---

## 11. CSS Specificity Gotchas

This codebase has had 6+ bugs from specificity clashes. Watch for:

1. **Inline `style={{...}}` beats CSS classes.**
   ```tsx
   // This style wins over any .class rule:
   <div className="color-red-500" style={{ color: "blue" }} /> // blue wins
   ```
   If a class looks inert, search the file for `style=`.

2. **`:not()` carries its argument's specificity.**
   ```css
   main section:not(#hero) { } /* (1 id, 0 class, 2 type) = specificity (1,0,2) */
   main #meals { } /* (1 id, 0 class, 1 type) = specificity (1,0,1) — LOSES */
   ```
   Selector: `main section#id` = (1,0,2), ties and wins by order.

3. **`.liquid-glass-chrome` sets `position: relative`.**
   ```tsx
   // This won't work; .liquid-glass-chrome's position beats Tailwind's:
   <div className="liquid-glass-chrome fixed inset-0" /> // position: relative wins
   ```
   Fix: move positioning to CSS, not classes.

4. **React 19 lint rejects setState in effect body.**
   ```tsx
   // WRONG — React lint error:
   useEffect(() => { setData(...); }, [])
   
   // RIGHT — defer with setTimeout:
   useEffect(() => { setTimeout(() => setData(...), 0); }, [])
   ```

---

## 12. CSP (Content Security Policy)

`next.config.ts` sets strict CSP headers. External requests are blocked:

- `media-src 'self'` — no CloudFront, YouTube, etc.
- `font-src 'self'` — no Google Fonts, Figma fonts
- `script-src 'self'` — no Sentry, external tracking (Analytics is whitelisted post-consent)
- Exception: Google Fonts stylesheets from `https://fonts.googleapis.com` (allowed)

**When adding external assets:**
- Self-host them (put in `public/`)
- Or inline as data URIs
- Don't rely on CDNs

---

## 13. Contrast & Accessibility

- Audit run with WAVE/aXe before shipping
- Sindoor palette passed at 0 failures (~920 text nodes) when built
- All images have alt text
- Buttons/links are ≥44px touch targets
- Colour is never the only indicator (+ icon, + text)
- Heading hierarchy: h1 on hero, h2 for sections, etc.

---

## 14. What to Build Next

Based on the plan at `.claude/plans/should-i-give-u-crispy-storm.md`:

1. **Wire auth & persistence** — signed-in users currently lose their data on refresh
2. **Fix `/profile` data loss bug** — form initializes from null, overwrites data
3. **Ship sindoor palette** — delete other 9, build dark variant
4. **Point scanner at Anthropic** — currently defaults to localhost
5. **Deploy edge functions** — payment verification and biomarker alerts
6. **Form error states** — login OTP and profile form validation
7. **Interactive thali** — mount `thali-3d.tsx`, wire drag-to-resize
8. **Meal photos** — populate `~/Downloads/poshan-meals/`, wire to cards

---

## 15. Getting Help

- **Tailwind classes**: https://tailwindcss.com/docs
- **Next.js docs**: Read `node_modules/next/dist/docs/` (breaking changes from training data)
- **Supabase**: Use `poshan-app:supabase` skill
- **React 19**: Breaking from 18 — re-read component patterns
- **Specificity**: Open DevTools, inspect, check "Styles" panel for what's winning

---

## 16. Quick Reference

| Task | Where | How |
|------|-------|-----|
| Change a colour | `globals.css` | Update `--token` in palette block |
| Add a meal | `poshan-data.ts` | Add to MEALS array + PLANS |
| Fix hero layout | `hero-video.tsx` | Check inline styles, check CSS |
| Add a condition | `poshan-data.ts` | Add enum + CONDITIONS array |
| Update UI text | Component file | Change `T({ en: "...", hi: "..." })` |
| Debug state | React DevTools | Inspect `PoshanApp` props |
| Check build | Terminal | `npm run build` |
| Check types | Terminal | `npx tsc --noEmit` |
| Check lint | Terminal | `npx eslint src` |

---

**Project maintained by Daksh.**  
**Last updated:** 2026-08-22  
**Build status:** ✅ Green  
**Deployment:** Ready (auth & persistence incomplete, not yet live)
