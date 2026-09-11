import { ImageResponse } from "next/og";

// Brand favicon set — crisp, code-drawn monogram (no binary assets).
// Sizes cover Google's search favicon requirement (multiple of 48), browser tabs, and PWA.
export function generateImageMetadata() {
  return [
    { id: "48", size: { width: 48, height: 48 }, contentType: "image/png" },
    { id: "96", size: { width: 96, height: 96 }, contentType: "image/png" },
    { id: "192", size: { width: 192, height: 192 }, contentType: "image/png" },
    { id: "512", size: { width: 512, height: 512 }, contentType: "image/png" },
  ];
}

export default function Icon({ id }: { id: string }) {
  const size = Number(id) || 48;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1c1917",
          color: "#b8860b",
          borderRadius: size * 0.22,
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontWeight: 700,
          fontSize: size * 0.64,
          lineHeight: 1,
        }}
      >
        C
      </div>
    ),
    { width: size, height: size }
  );
}
