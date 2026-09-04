# Image asset provenance

Written 2026-09-04. Covers every raster image shipped in this `public/` directory — the record a copyright inquiry or a due-diligence review would ask for first, and the thing that was missing before this.

## Dish and hero photography

| File | Source |
|---|---|
| `dishes/chutney.jpg`, `dishes/dahi.jpg`, `dishes/dal.jpg`, `dishes/rice.jpg`, `dishes/roti.jpg`, `dishes/sabzi.jpg` | Generated with Google Gemini |
| `meals/dosa.jpg`, `meals/paratha.jpg` | Generated with Google Gemini |
| `thali-hero.jpg` (used as both the still and motion background in `hero-video.tsx`) | Generated with Google Gemini |

**Rights position, as of the date above:** Google's terms for Gemini permit commercial use of generated output and do not claim ownership over it — confirmed via Google's published terms and Gemini's own support documentation before this file was written, not assumed. The one real limitation, and it's about *exclusivity* rather than *permission*: in most jurisdictions, a purely AI-generated image with no meaningful human creative input isn't independently copyrightable by the prompter. That means Poshan can use these images commercially without restriction, but couldn't stop a third party who generated a visually similar dish photo from using theirs too. For six food photos and a hero background, that's an acceptable trade — it would matter more for a brand mark, which is why the logo files below are handled differently.

**Re-verify before a fundraise or acquisition due-diligence pass** — AI-output terms are an actively shifting area of law and platform policy, and "confirmed on 2026-09-04" is a snapshot, not a permanent guarantee.

## Brand assets

| File | Source |
|---|---|
| `brand/logo-mark.png`, `brand/logo-lockup.png` | **Not yet documented — provenance unconfirmed as of this file's writing.** |

Unlike the dish photography, these are the marks a competitor or a platform (app store, payment processor) could actually challenge — worth being certain of, not just probably-fine-because-they're-generated. Confirm and update this row before launch: if these were also Gemini-generated, add them to the table above with the same reasoning; if they were commissioned, hand-drawn, or sourced elsewhere, record that instead.

## Non-image assets

Fonts (Anek Devanagari, DM Sans, Mukta, Instrument Serif, IBM Plex Mono) are Google Fonts under the SIL Open Font License 1.1, self-hosted via `next/font` — commercial use and redistribution are both explicitly permitted, no attribution required. GSAP (animation library) is fully free for commercial use, including every plugin, under its current standard license.
