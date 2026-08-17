import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0a0b0a", display: "flex",
        alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="0 0 40 40" width="132" height="132">
          <circle cx="20" cy="20" r="17" fill="none" stroke="#8FBF72" strokeWidth="2.6" />
          <circle cx="14" cy="15" r="4.4" fill="#E0A81C" />
          <circle cx="26" cy="15" r="4.4" fill="#8FBF72" />
          <ellipse cx="20" cy="27" rx="7.6" ry="4.4" fill="#C2410C" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
