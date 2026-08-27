import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getManifest, saveManifest, getImageResource, destroyImage, cloudForUrl } from "@/lib/cloudinary";
import { cloudForId, slugify, type Product, type ProductImage } from "@/lib/collections";
import { revalidatePath } from "next/cache";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const revalidateAll = () => revalidatePath("/", "layout");

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.finishId || !b?.typeId || !b?.name || !Array.isArray(b?.images) || !b.images.length)
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  const m = await getManifest({ fresh: true });
  const finish = m.finishes.find((f) => f.id === b.finishId);
  if (!finish) return NextResponse.json({ error: "Finish not found." }, { status: 404 });
  const images: ProductImage[] = [];
  for (const im of b.images as { publicId: string }[]) {
    const which = cloudForId(im.publicId.split("/").pop() as string);
    const res = await getImageResource(im.publicId, which);
    if (res) images.push({ publicId: im.publicId, url: res.url, width: res.width, height: res.height, cloud: which });
  }
  if (!images.length) return NextResponse.json({ error: "No valid images." }, { status: 400 });
  const id = randomUUID();
  const product: Product = { id, slug: `${slugify(b.name)}-${id.slice(0, 4)}`, name: String(b.name).trim(), finishId: b.finishId, typeId: b.typeId,
    price: Number(b.price) || 0, mrp: b.mrp ? Number(b.mrp) : undefined, description: b.description ? String(b.description) : undefined,
    inStock: b.inStock !== false, createdAt: Date.now(), images };
  finish.products.push(product);
  await saveManifest(m); revalidateAll();
  return NextResponse.json({ ok: true, product });
}

export async function PATCH(req: Request) {
  const b = await req.json().catch(() => null);
  const m = await getManifest({ fresh: true });
  let target: Product | undefined;
  for (const f of m.finishes) { const p = f.products.find((x) => x.id === b?.productId); if (p) { target = p; break; } }
  if (!target) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (typeof b.name === "string" && b.name.trim()) target.name = b.name.trim();
  if (b.price !== undefined) target.price = Number(b.price) || 0;
  if (b.mrp !== undefined) target.mrp = b.mrp ? Number(b.mrp) : undefined;
  if (typeof b.description === "string") target.description = b.description;
  if (typeof b.typeId === "string") target.typeId = b.typeId;
  if (typeof b.inStock === "boolean") target.inStock = b.inStock;
  if (Array.isArray(b.addImages)) {
    for (const im of b.addImages as { publicId: string }[]) {
      const which = cloudForId(im.publicId.split("/").pop() as string);
      const res = await getImageResource(im.publicId, which);
      if (res) target.images.push({ publicId: im.publicId, url: res.url, width: res.width, height: res.height, cloud: which });
    }
  }
  if (Array.isArray(b.removeImages)) {
    for (const pid of b.removeImages as string[]) {
      const img = target.images.find((i) => i.publicId === pid);
      if (img) { await destroyImage(img.publicId, cloudForUrl(img.url)).catch(() => {}); target.images = target.images.filter((i) => i.publicId !== pid); }
    }
  }
  await saveManifest(m); revalidateAll();
  return NextResponse.json({ ok: true, product: target });
}

export async function DELETE(req: Request) {
  const b = await req.json().catch(() => null);
  const m = await getManifest({ fresh: true });
  const finish = m.finishes.find((f) => f.id === b?.finishId);
  const product = finish?.products.find((p) => p.id === b?.productId);
  if (finish) finish.products = finish.products.filter((p) => p.id !== b?.productId);
  await saveManifest(m);
  for (const im of product?.images ?? []) await destroyImage(im.publicId, cloudForUrl(im.url)).catch(() => {});
  revalidateAll();
  return NextResponse.json({ ok: true });
}
