"use client";

/**
 * The SVG displacement filter that gives the glass its edge refraction.
 *
 * How it works: feTurbulence generates a smooth noise field, feGaussianBlur
 * softens it so the distortion is a slow warp rather than static, and
 * feDisplacementMap uses that field to push the backdrop's pixels sideways.
 * Referenced from CSS as `backdrop-filter: url(#poshan-glass) blur(…)`.
 *
 * Mounted once for the whole document. Filters are referenced by id, so a
 * second copy would be dead weight and an id collision.
 *
 * Support is genuinely uneven and this is not a detoration:
 *   Chromium/Edge, backdrop-filter: url() works.
 *   Safari      : applies SVG filters to backdrop inconsistently by version.
 *   Firefox     : does not support url() in backdrop-filter at all.
 * So every rule using it is wrapped in @supports, and the plain blur +
 * hairline glass remains the fallback. Non-Chromium users get the quieter
 * version rather than a broken one.
 */
export function GlassFilter() {
  return (
    <svg
      aria-hidden
      focusable="false"
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <defs>
        <filter
          id="poshan-glass"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          {/* Low frequency = broad, lens-like warping. High frequency here
              would read as frosted static rather than curved glass. */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.008"
            numOctaves={2}
            seed={11}
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="3" result="softNoise" />
          {/* scale is the bend depth. Past ~30 text behind the panel becomes
              unreadable, which matters here because panels sit over nutrition
              figures people are meant to read. */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale={18}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* A gentler variant for large surfaces, where a strong warp over a
            lot of content reads as a rendering fault rather than as glass. */}
        <filter
          id="poshan-glass-soft"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.006 0.006"
            numOctaves={2}
            seed={7}
            result="noise2"
          />
          <feGaussianBlur in="noise2" stdDeviation="4" result="softNoise2" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise2"
            scale={9}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
