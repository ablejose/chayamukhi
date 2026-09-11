import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getManifest, saveManifest, getImageResource, destroyImage, cloudForUrl, pickCloud, CloudNotConfiguredError } from "@/lib/cloudinary";
import { allProducts, slugify, type Product, type ProductImage } from "@/lib/collections";
import { revalidatePath } from "next/cache";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const revalidateAll = () => revalidatePath("/", "layout");

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null);
    if (!b?.finishId || !b?.typeId || !b?.name || !Array.isArray(b?.images) || !b.images.length)
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });
    const m = await getManifest({ fresh: true });
    const finish = m.finishes.find((f) => f.id === b.finishId);
    if (!finish) return NextResponse.json({ error: "Finish not found." }, { status: 404 });
    const images: ProductImage[] = [];
    for (const im of b.images as { publicId: string }[]) {
      const which = pickCloud(im.publicId.split("/").pop() as string);
      const res = await getImageResource(im.publicId, which);
      if (res) images.push({ publicId: im.publicId, url: res.url, width: res.width, height: res.height, cloud: cloudForUrl(res.url) });
    }
    if (!images.length) return NextResponse.json({ error: "No valid images." }, { status: 400 });
    const code = typeof b.code === "string" && b.code.trim() ? b.code.trim() : undefined;
    if (code && allProducts(m).some((p) => p.code === code))
      return NextResponse.json({ error: "Product code already in use." }, { status: 409 });
    const id = randomUUID();
    const product: Product = { id, slug: `${slugify(b.name)}-${id.slice(0, 4)}`, name: String(b.name).trim(), finishId: b.finishId, typeId: b.typeId,
      price: Number(b.price) || 0, mrp: b.mrp ? Number(b.mrp) : undefined, description: b.description ? String(b.description) : undefined, code,
      inStock: b.inStock !== false, createdAt: Date.now(), images };
    finish.products.push(product);
    await saveManifest(m); revalidateAll();
    return NextResponse.json({ ok: true, product });
  } catch (e) {
    if (e instanceof CloudNotConfiguredError) return NextResponse.json({ error: e.message, cloud: e.which }, { status: 503 });
    return NextResponse.json({ error: (e as Error)?.message || "Failed to create product." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
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
    if (typeof b.code === "string") {
      const code = b.code.trim();
      const tid = target.id;
      if (code && allProducts(m).some((p) => p.code === code && p.id !== tid))
        return NextResponse.json({ error: "Product code already in use." }, { status: 409 });
      target.code = code || undefined;
    }
    if (Array.isArray(b.addImages)) {
      for (const im of b.addImages as { publicId: string }[]) {
        const which = pickCloud(im.publicId.split("/").pop() as string);
        const res = await getImageResource(im.publicId, which);
        if (res) target.images.push({ publicId: im.publicId, url: res.url, width: res.width, height: res.height, cloud: cloudForUrl(res.url) });
      }
    }
    if (Array.isArray(b.removeImages)) {
      for (const pid of b.removeImages as string[]) {
        const img = target.images.find((i) => i.publicId === pid);
        if (img) {
          await destroyImage(img.publicId, cloudForUrl(img.url)).catch((err) => console.error(`[chayamukhi] destroyImage failed for ${img.publicId}:`, err?.message ?? err));
          target.images = target.images.filter((i) => i.publicId !== pid);
        }
      }
    }
    await saveManifest(m); revalidateAll();
    return NextResponse.json({ ok: true, product: target });
  } catch (e) {
    if (e instanceof CloudNotConfiguredError) return NextResponse.json({ error: e.message, cloud: e.which }, { status: 503 });
    return NextResponse.json({ error: (e as Error)?.message || "Failed to update product." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const b = await req.json().catch(() => null);
  const m = await getManifest({ fresh: true });
  const finish = m.finishes.find((f) => f.id === b?.finishId);
  const product = finish?.products.find((p) => p.id === b?.productId);
  if (finish) finish.products = finish.products.filter((p) => p.id !== b?.productId);
  await saveManifest(m);
  for (const im of product?.images ?? [])
    await destroyImage(im.publicId, cloudForUrl(im.url)).catch((err) => console.error(`[chayamukhi] destroyImage failed for ${im.publicId}:`, err?.message ?? err));
  revalidateAll();
  return NextResponse.json({ ok: true });
}
