import type { MetadataRoute } from "next";
import { getManifest } from "@/lib/cloudinary";
import { allProducts } from "@/lib/collections";
import { BRAND } from "@/config/brand";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = BRAND.siteUrl.replace(/\/$/, "");
  const now = new Date();

  let m;
  try { m = await getManifest(); } catch { m = null; }

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/finish`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/category`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/info`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  if (!m) return staticEntries;

  const finishEntries: MetadataRoute.Sitemap = m.finishes.map((f) => ({
    url: `${base}/shop?finish=${f.slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.6,
  }));
  const typeEntries: MetadataRoute.Sitemap = m.productTypes.map((t) => ({
    url: `${base}/shop?type=${t.slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.6,
  }));
  const productEntries: MetadataRoute.Sitemap = allProducts(m).map((p) => ({
    url: `${base}/product?slug=${encodeURIComponent(p.slug)}`,
    lastModified: p.createdAt ? new Date(p.createdAt) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...finishEntries, ...typeEntries, ...productEntries];
}
