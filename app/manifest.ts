import type { MetadataRoute } from "next";
import { BRAND } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — Imitation Jewellery`,
    short_name: BRAND.name,
    description: "Shop imitation jewellery online at Chayamukhi — serving Chalakkudy, Guruvayur and across Kerala. Anti-tarnish, German silver, oxidised and gold-plated pieces. Pan-India delivery, WhatsApp checkout.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#1c1917",
    lang: "en-IN",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
