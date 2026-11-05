/**
 * next/image loader. Every <Image> on the site goes through here, so each srcset
 * entry must be a real, differently sized file:
 *  - Cloudinary: f_auto (AVIF/WebP), q_auto, resized to the requested width.
 *  - Unsplash (the demo/section art): its own w= parameter. Before, these URLs were
 *    passed through untouched, so every srcset entry was the same fixed-size file.
 * Also used directly (outside <Image>) for the cart thumbnails.
 */
export default function cloudinaryLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  if (src.includes("/upload/")) {
    const t = `f_auto,q_${quality || "auto"},w_${width},c_limit`;
    return src.replace("/upload/", `/upload/${t}/`);
  }
  if (src.startsWith("https://images.unsplash.com/")) {
    try {
      const u = new URL(src);
      u.searchParams.set("w", String(width));
      if (quality) u.searchParams.set("q", String(quality));
      if (!u.searchParams.has("auto")) u.searchParams.set("auto", "format");
      return u.toString();
    } catch { return src; }
  }
  return src;
}
