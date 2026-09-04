# 002 — Gate the magnetic pull effect behind prefers-reduced-motion

- **Status**: DONE
- **Commit**: 8b7426f
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 file, ~15 lines changed

## Problem

`src/components/ui/magnetic-cursor.tsx` implements two separate motion
effects: the custom cursor itself, and a "magnetic pull" on every element
carrying `data-magnetic`, which physically translates that element toward
the pointer as it approaches (an elastic tug-of-war effect), then springs it
back on pointer-out.

The file does read `prefers-reduced-motion` once, at line 97:

```tsx
// src/components/ui/magnetic-cursor.tsx:97-98 — current
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const detachDuration = prefersReducedMotion ? 0.1 : 0.35;
```

But this value only ever adjusts the *cursor's own* detach timing (line 98)
and lerp responsiveness (`effectiveLerp`, line 118: `prefersReducedMotion ? 1
: lerpAmount`). It is never read anywhere near the magnetic-pull tweens
themselves:

```tsx
// src/components/ui/magnetic-cursor.tsx:206-207 — current, inside the
// per-magnetic-element setup loop, unconditional
const xTo = gsap.quickTo(el, 'x', { duration: 1, ease: 'elastic.out(1, 0.3)' });
const yTo = gsap.quickTo(el, 'y', { duration: 1, ease: 'elastic.out(1, 0.3)' });
```

```tsx
// src/components/ui/magnetic-cursor.tsx:275-291 — current, unconditional
let rafId: number | null = null;
const handlePointerMove = (event: PointerEvent) => {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    const { clientX, clientY } = event;
    const { height, width, left, top } = el.getBoundingClientRect();
    const { magneticFactor } = configRef.current;
    xTo((clientX - (left + width / 2)) * magneticFactor);
    yTo((clientY - (top + height / 2)) * magneticFactor);
    rafId = null;
  });
};

const handlePointerOut = () => {
  xTo(0);
  yTo(0);
};
```

So under `prefers-reduced-motion: reduce`, every nav link, button and card
carrying `data-magnetic` still visibly slides toward the pointer with an
elastic bounce as the mouse approaches it — this is exactly the class of
issue AUDIT.md §6 flags: *"movement with no `prefers-reduced-motion`
handling."* The cursor itself calms down; the thing it's supposedly pulling
does not.

## Target

Read `prefersReducedMotion` once at the top of the effect (it already is, at
line 97) and skip installing the magnetic-pull tweens entirely when it's
set — the element should sit still under a hovering pointer rather than
receive a zeroed-out but still-present tween.

```tsx
// target — inside the magneticElements.forEach(...) loop
magneticElements.forEach((el) => {
  const xTo = prefersReducedMotion
    ? null
    : gsap.quickTo(el, 'x', { duration: 1, ease: 'elastic.out(1, 0.3)' });
  const yTo = prefersReducedMotion
    ? null
    : gsap.quickTo(el, 'y', { duration: 1, ease: 'elastic.out(1, 0.3)' });

  // ...handlePointerEnter and handlePointerLeave (the cursor's own morph)
  // are UNCHANGED — the cursor may still grow/shrink over the element,
  // that's feedback, not movement of the page's own content. Only the
  // element's own position is being gated here.

  let rafId: number | null = null;
  const handlePointerMove = (event: PointerEvent) => {
    if (prefersReducedMotion || !xTo || !yTo) return;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      const { clientX, clientY } = event;
      const { height, width, left, top } = el.getBoundingClientRect();
      const { magneticFactor } = configRef.current;
      xTo((clientX - (left + width / 2)) * magneticFactor);
      yTo((clientY - (top + height / 2)) * magneticFactor);
      rafId = null;
    });
  };

  const handlePointerOut = () => {
    xTo?.(0);
    yTo?.(0);
  };

  // ...event listener wiring is UNCHANGED — handlePointerMove now simply
  // no-ops immediately under reduced motion instead of computing a tween.
});
```

This keeps AUDIT.md §6's "not zero" guidance in the right place: the
*cursor's* hover feedback (the morph into a rounded rectangle, handled by
plan 001) still runs — that's state indication, not gratuitous movement, and
stays gentle either way. Only the page content's own elastic chase-the-pointer
motion is removed under reduced motion, which is the actual position change
the media query exists to suppress.

## Repo conventions to follow

- `src/components/poshan/motion-layer.tsx:14,20,42,112` is the exemplar for
  this exact pattern in this codebase: read `usePrefersReducedMotion()`
  (or, here, the existing `window.matchMedia` read already at line 97) once,
  then skip *installing* the effect at all rather than running it in a
  disabled state — see the early `return` at line 112: `if (calm) return
  null;`. This plan applies the same "don't install it" discipline to the
  per-element `quickTo` tweens instead of leaving them active with a zeroed
  argument.
- `src/app/globals.css:1975-1979` (`.sweep` under
  `@media (prefers-reduced-motion: reduce)`) is the CSS-side sibling of the
  same convention: reduced motion removes the specific moving part, not the
  whole interactive affordance.

## Boundaries

- Do NOT change `handlePointerEnter` / `handlePointerLeave` (the cursor's own
  morph into a rounded rectangle over the element) — those stay exactly as
  they are after plan 001 is applied; this plan only touches the element's
  own `x`/`y` position tweens.
- Do NOT change the cursor's own `detachDuration` or `effectiveLerp` logic
  (lines 98, 118) — already correctly gated, leave as-is.
- Do NOT add a new `usePrefersReducedMotion` hook or import — this file
  already computes `prefersReducedMotion` locally at line 97; reuse that
  same variable, don't introduce a second mechanism.
- Do NOT touch any file other than `src/components/ui/magnetic-cursor.tsx`.
- If plan 001 has not been applied yet when this plan runs, that's fine —
  this plan's edits don't depend on it and don't touch the same lines
  (001 touches 224-238 and 258-272; this plan touches 206-207 and 275-291).
  If the line numbers here don't match what's found in the file (drift since
  commit 8b7426f), STOP and report instead of improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` from the repo root — expect no new
  errors.
- **Feel check**: start the dev server, open Chrome DevTools → Rendering tab
  → "Emulate CSS media feature prefers-reduced-motion" → set to "reduce".
  Then:
  - Hover several `data-magnetic` elements (nav links, primary buttons) and
    confirm they no longer slide toward the pointer — they should stay
    completely still at their natural position.
  - The custom cursor should still morph into a rounded rectangle over the
    hovered element (that part is unchanged and intentional).
  - Move the mouse away from an element quickly — confirm there's no
    lingering elastic snap-back animation on the element itself (there
    should be none at all under reduced motion, immediate or otherwise).
  - Switch "Emulate prefers-reduced-motion" back to "no preference" and
    confirm the magnetic pull returns exactly as it behaved before this
    change — elastic, responsive, unaffected by this fix.
- **Done when**: under emulated `prefers-reduced-motion: reduce`, no
  `data-magnetic` element visibly moves from its natural position on hover,
  and the effect is fully restored when the preference is turned off.
