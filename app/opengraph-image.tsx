import { ImageResponse } from "next/og";
import { BRAND } from "@/config/brand";

export const alt = `${BRAND.name} — ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Social share card (Open Graph / Twitter). Code-drawn, brand-matched.
export default function OpengraphImage() {
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
          background: "linear-gradient(135deg, #1c1917 0%, #2a2422 55%, #1c1917 100%)",
          color: "#faf7f2",
          fontFamily: "Georgia, 'Times New Roman', serif",
          padding: 80,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 22, letterSpacing: 10, textTransform: "uppercase", color: "#b8860b" }}>
          Imitation Jewellery · Kerala
        </div>
        <div style={{ marginTop: 24, fontSize: 132, fontWeight: 700, letterSpacing: 2, color: "#ffffff" }}>
          {BRAND.name}
        </div>
        <div style={{ marginTop: 20, height: 2, width: 220, background: "#b8860b" }} />
        <div style={{ marginTop: 28, fontSize: 34, color: "#e9e2d7", maxWidth: 900 }}>
          {BRAND.tagline}
        </div>
        <div style={{ marginTop: 40, fontSize: 22, letterSpacing: 3, color: "#b8860b", textTransform: "uppercase" }}>
          Anti-tarnish · German Silver · Oxidised · Gold Plated
        </div>
      </div>
    ),
    { ...size }
  );
}
