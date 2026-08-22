import { ImageResponse } from "next/og";

export const alt = "Poshan: Know your body. Eat like home.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Generated at build time, so there is no image asset to ship or keep in sync.
 * Drawn with the same masala palette and steel thali as the site, a shared
 * link should look like the product, not like a default card.
 *
 * Uses plain inline styles: ImageResponse runs Satori, which supports only a
 * subset of CSS and none of our custom properties, so the colours are literal.
 */
export default function OpengraphImage() {
  const ROTI = "#FAF6EF";
  const INK = "#221B14";
  const KESAR = "#A8500A";
  const STEEL = "#8C9196";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: ROTI,
          padding: 72,
          alignItems: "center",
          gap: 56,
        }}
      >
        {/* the thali mark */}
        <svg width="360" height="360" viewBox="0 0 400 400">
          <circle cx={200} cy={200} r={182} fill="none" stroke="#4A7C4E" strokeWidth={14} />
          <circle cx={200} cy={200} r={162} fill="none" stroke={STEEL} strokeWidth={7} />
          <circle cx={200} cy={200} r={152} fill="#FFFFFF" />
          <circle cx={106} cy={166} r={30} fill="#E0A81C" />
          <circle cx={150} cy={113} r={30} fill="#4A7C4E" />
          <circle cx={250} cy={113} r={30} fill="#DCE4E8" />
          <circle cx={294} cy={166} r={30} fill="#B33A20" />
          <ellipse cx={152} cy={280} rx={54} ry={33} fill="#F5E4C0" stroke="#6B4423" strokeWidth={2} />
          <path d="M248 302 Q249 258 287 250 Q326 258 326 302 Z" fill="#F5F1E6" stroke={STEEL} strokeWidth={3} />
        </svg>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 26,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: KESAR,
              fontWeight: 700,
            }}
          >
            पोषण · Poshan
          </div>
          <div style={{ fontSize: 76, color: INK, marginTop: 22, lineHeight: 1.05 }}>
            Know your body.
          </div>
          <div style={{ fontSize: 76, color: KESAR, lineHeight: 1.05 }}>
            Eat like home.
          </div>
          <div style={{ fontSize: 28, color: "#5C5044", marginTop: 30, maxWidth: 620 }}>
            Body Mass Index on Asian-Indian cutoffs, and the thali you already eat.
          </div>
        </div>
      </div>
    ),
    size
  );
}
