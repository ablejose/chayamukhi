export default function cloudinaryLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  const t = `f_auto,q_${quality || "auto"},w_${width},c_limit`;
  return src.includes("/upload/") ? src.replace("/upload/", `/upload/${t}/`) : src;
}
