import type { MetadataRoute } from "next";

import { SITE_URL as SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        /* Signed-in surfaces and API routes have nothing to index, and
           /login carries a ?next= parameter that would create duplicates. */
        disallow: ["/api/", "/dashboard", "/profile", "/login", "/dev"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
