# Animation plans

Findings from an `improve-animations quick` pass over the app's most
user-visible motion surfaces (Poshan's tab shell, hero/BMI tool, the
site-wide magnetic cursor, cards and sections). Most of the codebase's
existing motion is already disciplined — transform/opacity-only, gated for
`prefers-reduced-motion`, `ease-in` free — so this pass surfaced two real
issues, both in the same file, rather than a padded list.

| # | Title | Severity | Category | Status |
| --- | --- | --- | --- | --- |
| [001](001-magnetic-cursor-transform-only.md) | Magnetic cursor morph: transform, not width/height | HIGH | Performance | DONE |
| [002](002-magnetic-pull-reduced-motion.md) | Gate the magnetic pull behind prefers-reduced-motion | MEDIUM | Accessibility | DONE |

## Recommended execution order

**001 before 002.** They touch the same file
(`src/components/ui/magnetic-cursor.tsx`) but disjoint line ranges — 001
edits `handlePointerEnter`/`handlePointerLeave` (lines 224-238, 258-272),
002 edits the `quickTo` setup and `handlePointerMove`/`handlePointerOut`
(lines 206-207, 275-291) — so there's no hard dependency between them. Doing
001 first just avoids re-diffing the same file twice in flight; 002 does not
require 001 to already be applied.

## Not pursued

- `src/components/poshan/landing-hero.tsx` and `3d-poshan-hero.tsx` use
  Framer Motion `y`/`scale` shorthand props (a real AUDIT.md §5 pattern) but
  neither component is imported anywhere in the app (confirmed via
  repo-wide search) — dead code, zero user-visible leverage. Worth deleting
  as cleanup, but that's a separate, non-animation decision for the user to
  make, not an animation fix.
- Everything else surveyed (`motion-layer.tsx`, tab transitions in
  `sections.tsx`, the thali steam/breathe keyframes, `.sweep` button
  shimmer, form-shake/checkmark-draw, the food-scanner's `card-in` result)
  was already correct per AUDIT.md — transform/opacity only, properly
  reduced-motion gated, no bare `ease-in` anywhere in the repo.
