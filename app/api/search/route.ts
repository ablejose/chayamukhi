import { NextResponse } from "next/server";
import { getManifest } from "@/lib/cloudinary";
import { allProducts } from "@/lib/collections";
import type { SearchItem } from "@/lib/search";

// The search bar downloads this list once and filters in the browser, so suggestions
// appear as fast as the customer types. Rebuilt at most once a minute; admin product
// saves revalidate it straight away (see revalidateAll in /api/admin/products).
export const revalidate = 60;

export async function GET() {
  const m = await getManifest();
  const finishName = new Map(m.finishes.map((f) => [f.id, f.name] as const));
  const typeName = new Map(m.productTypes.flatMap((t) => [[t.id, t.name], [t.slug, t.name]] as const));
  const items: SearchItem[] = allProducts(m).map((p) => ({
    n: p.name,
    c: p.code,
    s: p.slug,
    i: p.images[0]?.url,
    p: p.price,
    f: finishName.get(p.finishId),
    t: typeName.get(p.typeId),
    d: p.createdAt,
    ...(p.inStock ? {} : { x: 1 as const }),
  }));
  return NextResponse.json(items);
}
