# Poshan — Session Work Log

**Date:** 2026-08-22  
**User:** Daksh (dakshg2233@gmail.com)  
**Commits:** 6 in this session  

---

## Summary

Cleaned up the hero, restructured navigation, added essential SEO and privacy infrastructure, and began work toward an interactive thali based on BMI. The site now boots clean, dev tools are hidden, and the photography is visible.

---

## What Changed

### 1. Hero Cleanup & Visibility (`16dc77c`)

**Problem:** The hero was visually broken — overlays were stacked so heavily the thali photograph was barely readable, and dev tools (cursor picker, palette control) were sitting on the composition, with the cursor chip directly beneath the logo.

**Fix:**
- Lifted the three overlays (radial scrim, linear scrim, amber bloom) to reduce opacity and weight
- Removed dev tools from the render path (commented out, one line each to restore)
- Added a **text-only scrim** behind the centre column only, not the whole frame, so the copy has legible ground without hiding the food
- Result: food is visible, text is legible, composition is clean

**Files touched:**
- `src/components/poshan/hero-video.tsx` — reduced overlay opacity, added centre-column scrim
- `src/components/poshan/poshan-app.tsx` — commented out `<CursorPicker />` and `<PaletteControl />`

---

### 2. Navigation Restructure (`18a8670`)

**Problem:** Nav headings were brand-speak ("Ritual", "Our blends", "The science", "Journal") that described a supplements company, not a nutrition tool. Nav was centred in the header instead of grouped at the right.

**Fix:**
- Renamed all four headings to conventional section names:
  - "Ritual" → removed entirely
  - "Our blends" → Meal plans
  - "The science" → Biomarkers
  - "Journal" → Pricing (was "Journal", now points to `#premium`)
  - "Reach us" → For clinics
- Verified every href resolves to an actual section (no dead links)
- Changed header from three-track grid (brand / centred pill / CTA) to brand-left / everything-else-right
- Nav pill and CTA now read as one right-hand block

**Measured at 1280px:**
- Brand ends at 120px
- Pill runs 731→1096px
- CTA sits 1108→1252px (28px from edge)
- Whole group past the 50% viewport halfway line

**Files touched:**
- `src/components/poshan/hero-video.tsx` — updated `NAV` array, rewrote header layout

---

### 3. Rice Redraw (`3a1613d`)

**Problem:** Rice was a single smooth arc with three dots — read as a bun or pebble, not grain.

**Fix:**
- Replaced with a lumpy contour (thousands of grains never settle into a clean curve)
- Added loose grains breaking the outline (proud of the shell)
- Added individual grain strokes at mixed angles across the body
- Now reads as a heap of rice, not a sealed shape

**Files touched:**
- `src/components/poshan/thali.tsx` — rewrote rice path and grain detailing

---

### 4. SEO & Privacy Scaffold (`f8bb5fb`, `98f94f8`)

**Added:**
- `src/app/robots.ts` — disallows `/api`, `/dashboard`, `/profile`, `/login`; points to sitemap
- `src/app/sitemap.ts` — lists `/`, `/privacy`, `/terms` with weekly/yearly frequencies
- `src/app/privacy/page.tsx` — full privacy policy (written from what the code actually does, marked `[TO CONFIRM]` for unknowns)
- `src/app/terms/page.tsx` — terms of service (same principle, India-focused)
- Contact details filled in: Poshan Limited, email, phone, postal line (placeholder noted)

**Key decision:** Both pages are written from what the *code actually does* — the schema, Supabase OTP, Razorpay — not from a template. Every legal fact I cannot know is marked `[TO CONFIRM]` rather than invented (entity registration status, postal address verification, scan retention policy, refund window). A privacy policy stating false facts about a health product is worse than an incomplete one.

---

### 5. Favicons, Metadata & Loading States (`3f4046f`)

**Added:**
- `src/app/icon.tsx` (32px) and `src/app/apple-icon.tsx` (180px) — generated at build time
- Route layouts for `/login`, `/dashboard`, `/profile` with per-page metadata (all `noindex`)
- Loading states on root, `/dashboard`, `/profile` — painted on `var(--roti)` so no white flash
- `src/app/thank-you/page.tsx` — post-checkout confirmation page (noindex)

**Cookie banner & analytics (`src/components/poshan/consent.tsx`):**
- Consent-first design: nothing loads and no identifier is set until someone accepts
- A banner that appears *after* tracking has started is theatre and not legal consent
- Analytics (Google Analytics) loads only after acceptance, with IP anonymised and `allow_google_signals: false`
- `NEXT_PUBLIC_ANALYTICS_ID` is unset, so today it loads nothing — correct default for a site with no analytics provider yet

**Sticky mobile CTA (`src/components/poshan/sticky-cta.tsx`):**
- Phone only, appears once the hero is behind you
- Hides again near the footer to never stack with cookie banner
- Drives to `#check` (the "See my thali" button in the Hero section)

**Image compression:**
- Hero image: 820K → 527K (35% savings) at 2000px wide

---

## Outstanding & Next Steps

### Not Done This Session

**Form error states** on login OTP and profile forms — the last item from the "add all of them" checklist. This is real work, not config:
- Login form: OTP validation, retry logic, rate limiting messaging
- Profile form: field-level validation, save success/failure states

### The Interactive Thali (Photo + BMI-Responsive Portions)

You offered a real thali photo. Before building, I asked three clarifying questions:

**1. Rice shape** — resolved, redrawn  
**2. Photo interaction strategy** — You chose: **photo base + interactive overlay**
   - Your photo is the plate and katoris; portion amounts are translucent fills that grow/shrink with BMI
   - One photo needed (no swapping per-band)
   - The shot is 3/4 perspective (not flat overhead), so each katori needs hand-fitted ellipses for perspective

**3. What the user can change** — You chose: **drag each portion up/down**
   - Portions auto-set from BMI by default
   - User can drag rice, dal, sabzi, roti individually, with macros updating live
   - Portions persist via the existing profile layer (across refresh, across devices when signed in)

**Next steps when ready:**
1. Save the thali photo to `public/thali-plate.jpg`
2. Build six perspective-fitted overlay fills (one per katori + rice)
3. Wire drag-to-resize with live calorie/macro readout
4. Connect to `use-body-profile` layer for persistence

---

## Current State

**Build:** Green (`npm run build` ✓)  
**Lint:** 0 errors  
**TypeScript:** No errors  
**Hero:** Visible food, legible text, clean composition  
**Nav:** Conventional labels, grouped at far right  
**Rice:** Reads as rice  
**SEO:** robots.txt, sitemap.xml, privacy, terms, per-page metadata  
**Auth:** Favicons, loading states, consent-gated analytics, thank-you flow  

---

## Files Changed in This Session

```
src/components/poshan/hero-video.tsx          — overlay opacity, text scrim, nav labels
src/components/poshan/poshan-app.tsx          — mount Consent, StickyCta; hide dev tools
src/components/poshan/thali.tsx               — rice redraw
src/app/not-found.tsx                         — (from prior session, kept for reference)
src/app/globals.css                           — (404 mobile CSS from prior session)
src/app/robots.ts                             — NEW
src/app/sitemap.ts                            — NEW
src/app/privacy/page.tsx                      — NEW
src/app/terms/page.tsx                        — NEW
src/app/thank-you/page.tsx                    — NEW
src/app/login/layout.tsx                      — NEW (per-page metadata)
src/app/dashboard/layout.tsx                  — NEW
src/app/profile/layout.tsx                    — NEW
src/app/loading.tsx                           — NEW (copied to dashboard/ and profile/)
src/app/icon.tsx                              — NEW
src/app/apple-icon.tsx                        — NEW
src/components/poshan/consent.tsx             — NEW
src/components/poshan/sticky-cta.tsx          — NEW
public/thali-hero.jpg                         — compressed (820K → 527K)
```

---

## Contact Info (From Privacy & Terms)

**Entity:** Poshan Limited  
**Address:** x Street, B Block *(placeholder — needs real postal line)*  
**Email:** dakshg2233@gmail.com *(personal, now public — consider role address)*  
**Phone:** +91 85956 07565 *(personal, now public — consider business number)*  
**Governing Law:** India  

---

## Useful Commit Messages

- `16dc77c` — Uncover the food, and take the dev tools off the page
- `18a8670` — Use conventional nav headings and move the group to the far right
- `3a1613d` — Redraw the rice so it reads as rice
- `f8bb5fb` — Add 404, robots, sitemap, privacy and terms
- `98f94f8` — Fill in contact details on privacy and terms
- `3f4046f` — Add favicons, per-page meta, consent-gated analytics, sticky CTA, thank-you

---

## Notes for Future Sessions

1. **The plan exists** at `/Users/sachindahiya/.claude/plans/should-i-give-u-crispy-storm.md` — covers: fixing build errors, wiring auth/persistence, shipping sindoor palette, pointing scanner at Anthropic, and cleanup. Consider it next.

2. **Dev tools are commented out, not deleted** — one-line uncomment each to restore cursor picker and palette control.

3. **The thali photo** — when you have it ready, save to `public/thali-plate.jpg` and we can wire the interactive overlay.

4. **Contact details are marked** — the postal line needs verification, and the email/phone are personal (now public). Update both before going live.

5. **Dark mode** — sindoor palette exists but only has a light variant wired. Dark mode needs its own pass.
