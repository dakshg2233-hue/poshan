import fs from "node:fs";
import path from "node:path";
import { DEFAULT_HERO_PHOTO } from "./hero-photos";

/**
 * Every hero photograph, found by reading the folder.
 *
 * The list used to be three paths typed into an array, which meant adding
 * a photograph was a code change — the thing most likely to stop anyone
 * bothering. Now `public/hero/` is the list: drop a file in, and it is in
 * the rotation on the next build.
 *
 * Read on the server only. This module must never be imported from a
 * client component; hero-photos.ts holds the fallback the client needs.
 *
 * Sorted so the order is stable between builds. The order does not affect
 * what a visitor sees — the pick is random — but an unstable list would
 * churn the generated script on every deploy for no reason.
 */
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

export function heroPhotos(): string[] {
  let names: string[] = [];
  try {
    /* Spelled out rather than built from HERO_DIR. The bundler cannot see
       through a variable, so it assumed any file might be read and traced
       the whole project, public/ included, into every server function. A
       literal path limits that to this one folder. */
    names = fs.readdirSync(path.join(process.cwd(), "public", "hero"));
  } catch {
    /* No folder is not a crash: the fallback still paints. */
    return [DEFAULT_HERO_PHOTO];
  }

  const found = names
    .filter((n) => IMAGE_EXT.has(path.extname(n).toLowerCase()))
    /* Skip the notes file and anything starting with a dot or underscore,
       so a work-in-progress can sit in the folder without shipping. */
    .filter((n) => !n.startsWith(".") && !n.startsWith("_"))
    .sort()
    .map((n) => `/hero/${n}`);

  return found.length > 0 ? found : [DEFAULT_HERO_PHOTO];
}

/** Where the last-shown photograph is remembered between visits. */
const LAST_SHOWN_KEY = "poshan:hero:last";

/**
 * Runs from the root layout, which is a server component, so this reaches
 * the browser as a real <script> the parser executes. The same markup
 * inside a client component would not run at all: React inserts those
 * through innerHTML, and browsers never execute scripts added that way.
 *
 * It has to run before paint rather than in an effect, because picking
 * after hydration means the first photograph is painted and then replaced
 * — a visible swap on the largest element on the page. Writing a CSS
 * custom property while the HTML is still parsing means only the chosen
 * photograph is ever painted.
 *
 * The value goes into an injected <style> rather than onto
 * documentElement.style, because React hydrates the <html> element and an
 * inline style it did not render is an attribute mismatch, logged on every
 * load. A style element appended to head is not something React
 * reconciles.
 *
 * The previous photograph is excluded from the draw. A plain random pick
 * over a small folder repeats often — with three photographs, one visit in
 * three shows the same one again, which reads as "the rotation is broken"
 * rather than as chance. Remembering one filename in localStorage rather
 * than sessionStorage means a new tab counts as a new visit too, which is
 * how someone actually returns to the site. Storage is read and written
 * inside their own try/catch: it throws outright in some private-browsing
 * modes, and a hero that fails to paint is far worse than a repeat.
 *
 * It preloads only the photograph it picked — preloading a default and
 * then showing a different one would fetch two to display one — and is
 * gated on the home path, since the hero renders nowhere else.
 */
export function heroPickScript(): string {
  return `(function(){try{
if(location.pathname!=='/')return;
var p=${JSON.stringify(heroPhotos())};
var k=${JSON.stringify(LAST_SHOWN_KEY)};
var last=null;try{last=localStorage.getItem(k)}catch(e){}
var pool=p.filter(function(x){return x!==last});
if(pool.length===0)pool=p;
var c=pool[Math.floor(Math.random()*pool.length)];
try{localStorage.setItem(k,c)}catch(e){}
var s=document.createElement('style');
s.textContent=":root{--hero-photo:url('"+c+"')}";
document.head.appendChild(s);
var l=document.createElement('link');
l.rel='preload';l.as='image';l.href=c;l.setAttribute('fetchpriority','high');
document.head.appendChild(l);
}catch(e){}})();`;
}
