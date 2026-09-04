/**
 * Health Companion's mark — not a stethoscope or a red cross on purpose.
 * Those read as clinical authority, which is exactly the framing Poshan
 * deliberately avoids everywhere else on the site (see conditions.ts's
 * MEDICAL_DISCLAIMER and why this chatbot isn't named "Doctor" anything).
 * A pulse line still reads as "health" at a glance without claiming to be a
 * doctor — it's wrapped in a leaf-drop so the mark stays legible as
 * Poshan's own, not a borrowed medical icon.
 *
 * `pulse` drives the outer glow ring — off by default so it only draws the
 * eye where that's actually the point (the floating launcher), not
 * everywhere the mark appears (e.g. next to the tab label).
 */
export function HealthCompanionMark({
  size = 28,
  pulse = false,
}: {
  size?: number;
  pulse?: boolean;
}) {
  return (
    <span
      className={pulse ? "health-mark-pulse" : undefined}
      style={{ position: "relative", display: "inline-flex", width: size, height: size }}
    >
      <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden role="img">
        <defs>
          <linearGradient id="hc-grad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--kesar)" />
            <stop offset="1" stopColor="var(--mirch)" />
          </linearGradient>
        </defs>
        {/* Leaf-drop body: an asymmetric circle, one corner drawn to a point,
            reading as a leaf rather than a plain badge. */}
        <path
          d="M20 3c9 0 17 7.8 17 16.5S29.5 37 20 37 3 29.7 3 20.8C3 12 11 3 20 3Z"
          fill="url(#hc-grad)"
        />
        {/* The pulse line: flat, a rise, a deep drop, a rise, flat — the
            universal ECG silhouette, thin enough to read as a line rather
            than a shape of its own. */}
        <path
          d="M9 21h5l2.4-6.5L20 27l2.6-9.5L24.5 21H31"
          fill="none"
          stroke="#fff"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
