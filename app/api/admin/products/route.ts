import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mutateManifest, AbortMutation, getImageResource, destroyImage, cloudForUrl, pickCloud } from "@/lib/cloudinary";
import { allProducts, slugify, type Product, type ProductImage } from "@/lib/collections";
import { errorResponse } from "@/lib/apiError";
import { revalidatePath } from "next/cache";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const revalidateAll = () => revalidatePath("/", "layout");

/** Resolve uploaded publicIds into stored image records. Done outside the mutation — it is a side effect. */
async function resolveImages(input: unknown): Promise<ProductImage[]> {
  const images: ProductImage[] = [];
  for (const im of (Array.isArray(input) ? input : []) as { publicId: string }[]) {
    if (!im?.publicId) continue;
    const which = pickCloud(im.publicId.split("/").pop() as string);
    const res = await getImageResource(im.publicId, which);
    if (res) images.push({ publicId: im.publicId, url: res.url, width: res.width, height: res.height, cloud: cloudForUrl(res.url) });
  }
  return images;
}

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null);
    if (!b?.finishId || !b?.typeId || !b?.name || !Array.isArray(b?.images) || !b.images.length)
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });

    const images = await resolveImages(b.images);
    if (!images.length) return NextResponse.json({ error: "No valid images." }, { status: 400 });

    // Generated once, outside the mutation, so a retry re-uses the same id and slug
    // instead of creating a second product.
    const id = randomUUID();
    const createdAt = Date.now();

    const { result: product } = await mutateManifest((m) => {
      const finish = m.finishes.find((f) => f.id === b.finishId);
      if (!finish) throw new AbortMutation(404, "Finish not found.");
      const code = typeof b.code === "string" && b.code.trim() ? b.code.trim() : undefined;
      if (code && allProducts(m).some((p) => p.code === code)) throw new AbortMutation(409, "Product code already in use.");
      if (finish.products.some((p) => p.id === id)) return finish.products.find((p) => p.id === id) as Product;

      const p: Product = {
        id, slug: `${slugify(b.name)}-${id.slice(0, 4)}`, name: String(b.name).trim(),
        finishId: b.finishId, typeId: b.typeId,
        price: Number(b.price) || 0, mrp: b.mrp ? Number(b.mrp) : undefined,
        description: b.description ? String(b.description) : undefined, code,
        inStock: b.inStock !== false, createdAt, images,
      };
      finish.products.push(p);
      return p;
    });

    revalidateAll();
    return NextResponse.json({ ok: true, product });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const b = await req.json().catch(() => null);
    if (!b?.productId) return NextResponse.json({ error: "Missing productId." }, { status: 400 });

    const added = Array.isArray(b.addImages) ? await resolveImages(b.addImages) : [];

    const { result } = await mutateManifest((m) => {
      let target: Product | undefined;
      for (const f of m.finishes) { const p = f.products.find((x) => x.id === b.productId); if (p) { target = p; break; } }
      if (!target) throw new AbortMutation(404, "Not found.");

      if (typeof b.name === "string" && b.name.trim()) target.name = b.name.trim();
      if (b.price !== undefined) target.price = Number(b.price) || 0;
      if (b.mrp !== undefined) target.mrp = b.mrp ? Number(b.mrp) : undefined;
      if (typeof b.description === "string") target.description = b.description;
      if (typeof b.typeId === "string") target.typeId = b.typeId;
      if (typeof b.inStock === "boolean") target.inStock = b.inStock;
      if (typeof b.code === "string") {
        const code = b.code.trim();
        const tid = target.id;
        if (code && allProducts(m).some((p) => p.code === code && p.id !== tid)) throw new AbortMutation(409, "Product code already in use.");
        target.code = code || undefined;
      }

      for (const im of added) if (!target.images.some((x) => x.publicId === im.publicId)) target.images.push(im);

      const removed: ProductImage[] = [];
      if (Array.isArray(b.removeImages)) {
        for (const pid of b.removeImages as string[]) {
          const img = target.images.find((i) => i.publicId === pid);
          if (img) { removed.push(img); target.images = target.images.filter((i) => i.publicId !== pid); }
        }
      }
      return { product: target, removed };
    });

    // Irreversible deletes only after the write has committed.
    for (const im of result.removed)
      await destroyImage(im.publicId, cloudForUrl(im.url)).catch((err) => console.error(`[chayamukhi] destroyImage failed for ${im.publicId}:`, err?.message ?? err));

    revalidateAll();
    return NextResponse.json({ ok: true, product: result.product });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const b = await req.json().catch(() => null);

    const { result: orphaned } = await mutateManifest((m) => {
      const finish = m.finishes.find((f) => f.id === b?.finishId);
      if (!finish) throw new AbortMutation(404, "Finish not found.");
      const product = finish.products.find((p) => p.id === b?.productId);
      if (!product) throw new AbortMutation(404, "Product not found.");
      finish.products = finish.products.filter((p) => p.id !== b?.productId);
      return product.images;
    });

    for (const im of orphaned)
      await destroyImage(im.publicId, cloudForUrl(im.url)).catch((err) => console.error(`[chayamukhi] destroyImage failed for ${im.publicId}:`, err?.message ?? err));

    revalidateAll();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
