import { NextResponse } from "next/server";
import { getManifest, getOrders, isCloudConfigured, activeClouds, cloudForUrl } from "@/lib/cloudinary";
import { CLOUD_KEYS, allProducts } from "@/lib/collections";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";

/**
 * Admin-only health + Cloudinary distribution check (protected by middleware).
 * GET /api/admin/health — verifies there is no silent fallback and reports, live,
 * whether images are spread evenly or piling onto one account.
 */
export async function GET() {
  const clouds = Object.fromEntries(
    CLOUD_KEYS.map((k) => [k, { configured: isCloudConfigured(k), cloudName: process.env[`CLOUDINARY_${k.toUpperCase()}_CLOUD_NAME`] ?? null }])
  );
  const active = activeClouds();

  const m = await getManifest({ fresh: true });
  const products = allProducts(m);

  // Physical distribution, derived from each image's real URL (not the stored label).
  const distribution: Record<string, number> = { c1: 0, c2: 0, c3: 0 };
  let images = 0;
  let mislabeled = 0; // images whose stored `cloud` field disagrees with the account in their URL
  for (const p of products) {
    for (const im of p.images) {
      images++;
      const real = cloudForUrl(im.url);
      distribution[real] = (distribution[real] ?? 0) + 1;
      if (im.cloud && im.cloud !== real) mislabeled++;
    }
  }

  const counts = active.map((k) => distribution[k] ?? 0);
  const max = counts.length ? Math.max(...counts) : 0;
  const min = counts.length ? Math.min(...counts) : 0;
  const skewPercent = max === 0 ? 0 : Math.round(((max - min) / max) * 1000) / 10;

  const warnings: string[] = [];
  if (!isCloudConfigured("c1"))
    warnings.push("c1 is NOT configured. The catalog (manifest) and orders live on c1 — the store cannot read or write data without it.");
  for (const k of ["c2", "c3"] as const)
    if (!isCloudConfigured(k)) warnings.push(`${k} is NOT configured. Uploads spread across only [${active.join(", ")}]. Set CLOUDINARY_${k.toUpperCase()}_* to use all three.`);
  if (active.length === 1)
    warnings.push("Only one Cloudinary account is active — every image piles onto it and it will fill fast. Configure c2 and c3 for an even 3-way spread.");
  if (mislabeled > 0)
    warnings.push(`${mislabeled} image(s) have a stored 'cloud' label that disagrees with their URL (legacy silent-fallback data). Harmless — deletes resolve the account from the URL — but the label is stale.`);

  let ordersCount: number | null = null;
  try { ordersCount = (await getOrders({ fresh: true })).length; } catch { ordersCount = null; }

  return NextResponse.json({
    ok: isCloudConfigured("c1") && warnings.length === 0,
    checkedAt: new Date().toISOString(),
    activeClouds: active,
    clouds,
    images: { total: images, distribution, skewPercent, balanced: skewPercent <= 25, mislabeled },
    catalog: { finishes: m.finishes.length, products: products.length, offers: m.offers.length, orders: ordersCount },
    warnings,
  });
}
