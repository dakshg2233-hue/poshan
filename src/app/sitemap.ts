import type { MetadataRoute } from "next";

import { SITE_URL as SITE } from "@/lib/site";

/** Only publicly indexable pages. /dashboard and /profile need an account. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    /* Ranked second only to the homepage: this is the page most likely to
       be found in search or shared, since it answers a question people
       actually type ("am I overweight") with an answer they don't expect. */
    { url: `${SITE}/bmi`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
