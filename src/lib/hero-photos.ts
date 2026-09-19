/**
 * The hero photographs, and the snippet that picks one.
 *
 * One thali on every landing read as the same page every time. These rotate
 * per visit — all vegetarian, which is the constraint, and all cropped to
 * the same 1.83 aspect the hero has always used, so the frame never shifts
 * or letterboxes when the picture changes.
 *
 * On "vector": a photograph cannot be one. SVG describes shapes, so
 * vectorising a food photo produces a flat poster illustration rather than
 * a sharper photograph. What actually prevents softness on a large screen
 * is resolution and framing — each of these is at least 1600px wide,
 * encoded progressively at the same quality, and painted with `cover`,
 * which crops rather than stretches, so no aspect is ever distorted.
 */
export const HERO_PHOTOS = [
  "/thali-hero.jpg",
  "/meals/dosa.jpg",
  "/meals/paratha.jpg",
] as const;

/** Rendered into the CSS as the fallback, so the page is never without a
 *  hero when the snippet cannot run — JavaScript off, or a crawler. */
export const DEFAULT_HERO_PHOTO = HERO_PHOTOS[0];

/**
 * Runs from the root layout, which is a server component, so this reaches
 * the browser as a real <script> the parser executes. The same markup
 * inside a client component would not run at all: React inserts those
 * through innerHTML, and browsers never execute scripts added that way —
 * which is exactly how the first attempt at this failed silently.
 *
 * It has to run before paint rather than in an effect, because picking
 * after hydration means the first photograph is painted and then replaced
 * — a visible swap on the largest element on the page. Writing a CSS
 * custom property while the HTML is still parsing means only the chosen
 * photograph is ever painted, and React never sees the value, so there is
 * no hydration mismatch.
 *
 * The value goes into an injected <style> rather than onto
 * documentElement.style, because React hydrates the <html> element and an
 * inline style it did not render is an attribute mismatch — which is
 * exactly what the first version produced: a hydration error on every
 * load, logged as "this won't be patched up". A style element appended to
 * head is not something React reconciles, so the same custom property
 * arrives with no complaint.
 *
 * It preloads only the photograph it picked. Preloading the default and
 * then showing a different one would fetch two to display one.
 *
 * Gated on the home path: the hero renders nowhere else, and every other
 * page would otherwise pay for a preload it never uses.
 */
export const HERO_PICK_SCRIPT = `(function(){try{
if(location.pathname!=='/')return;
var p=${JSON.stringify(HERO_PHOTOS)};
var c=p[Math.floor(Math.random()*p.length)];
var s=document.createElement('style');
s.textContent=":root{--hero-photo:url('"+c+"')}";
document.head.appendChild(s);
var l=document.createElement('link');
l.rel='preload';l.as='image';l.href=c;l.setAttribute('fetchpriority','high');
document.head.appendChild(l);
}catch(e){}})();`;
