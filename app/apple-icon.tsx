import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple touch icon (home-screen). Filled background (no transparency), per Apple guidance.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1c1917",
          color: "#b8860b",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div style={{ fontSize: 108, fontWeight: 700, lineHeight: 1 }}>C</div>
        <div style={{ marginTop: 8, fontSize: 15, letterSpacing: 4, color: "#faf7f2", textTransform: "uppercase" }}>Chayamukhi</div>
      </div>
    ),
    { ...size }
  );
}
