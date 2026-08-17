import type { NextConfig } from "next";

/**
 * Security headers. There were none before this.
 *
 * The Content-Security-Policy is the important one: it means that even if
 * something injects a script tag, the browser refuses to run it unless it
 * comes from an origin listed here. Razorpay's checkout domain is allowed
 * because their hosted payment window has to load; nothing else third-party is.
 */
const csp = [
  "default-src 'self'",
  // Razorpay checkout injects its own script and needs eval-free inline setup.
  // unsafe-eval is needed for React dev mode debugging features.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://*.razorpay.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.razorpay.com",
  "font-src 'self' data:",
  // Supabase and Razorpay APIs, plus the Gemini call is server-side only.
  "connect-src 'self' https://*.supabase.co https://*.razorpay.com wss://*.supabase.co",
  // Razorpay opens its payment window in an iframe.
  "frame-src https://*.razorpay.com https://api.razorpay.com",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Stops this site being iframed into someone else's page for clickjacking.
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false, // do not advertise the framework version
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            // The scanner needs the camera; nothing else is granted.
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(), payment=(self)",
          },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
      {
        // Never let a proxy or browser cache an API response.
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
    ];
  },
};

export default nextConfig;
