import type { MetadataRoute } from "next";

/**
 * Makes Poshan installable to a phone's home screen.
 *
 * There was already a service worker at public/sw.js driving push
 * notifications, so the app could interrupt someone's day but could not be
 * kept on their home screen — the half of "app-like" that costs a user
 * nothing and the half that matters most for retention was missing. A
 * manifest is what closes that, and for Poshan's audience it is also the
 * cheaper answer than a store listing: an Android user on a mid-range
 * phone installs this in two taps with no download.
 *
 * `display: standalone` drops the browser chrome, which is what makes the
 * launcher icon feel like it opened an app rather than a bookmark.
 * `id` is set explicitly so a later change to start_url doesn't register
 * as a different app and strand everyone's existing install.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Poshan — पोषण",
    short_name: "Poshan",
    description:
      "Indian nutrition and biomarker tracking. BMI on Asian-Indian cutoffs, meal plans from food people actually cook, in Hindi and English.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    /* --roti and --kesar from globals.css: the app's own ground and accent,
       so the splash screen and status bar match what loads behind them
       rather than flashing white first. */
    background_color: "#fdfbfa",
    theme_color: "#b03b0a",
    lang: "en",
    dir: "ltr",
    categories: ["health", "fitness", "medical", "food"],
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Scan a meal",
        short_name: "Scan",
        description: "Photograph your plate and log what's on it",
        url: "/dashboard?tab=scanner",
      },
      {
        name: "Today's plan",
        short_name: "Today",
        description: "What to eat next",
        url: "/dashboard",
      },
    ],
  };
}
