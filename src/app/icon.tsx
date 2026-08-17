import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Favicon: the thali mark, legible at 32px where fine detail disappears. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0a0b0a", display: "flex",
        alignItems: "center", justifyContent: "center", borderRadius: 6 }}>
        <svg viewBox="0 0 40 40" width="26" height="26">
          <circle cx="20" cy="20" r="17" fill="none" stroke="#8FBF72" strokeWidth="3" />
          <ellipse cx="20" cy="26" rx="8" ry="4.5" fill="#8FBF72" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
