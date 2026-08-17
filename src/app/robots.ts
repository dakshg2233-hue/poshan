import type { MetadataRoute } from "next";

/** Site origin. Set NEXT_PUBLIC_SITE_URL at deploy time. */
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://poshan.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        /* Signed-in surfaces and API routes have nothing to index, and
           /login carries a ?next= parameter that would create duplicates. */
        disallow: ["/api/", "/dashboard", "/profile", "/login"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
