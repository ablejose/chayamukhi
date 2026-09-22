import { NextResponse } from "next/server";
import { mutateManifest, AbortMutation, getImageResource, destroyImage, cloudForUrl } from "@/lib/cloudinary";
import { slugify, type Finish, type ProductImage } from "@/lib/collections";
import { errorResponse } from "@/lib/apiError";
import { revalidatePath } from "next/cache";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const revalidateAll = () => revalidatePath("/", "layout");

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null);
    if (!b?.name) return NextResponse.json({ error: "Missing name." }, { status: 400 });
    const { result: finish } = await mutateManifest((m) => {
      const slug = slugify(String(b.name));
      if (m.finishes.some((f) => f.id === slug)) throw new AbortMutation(409, "Finish already exists.");
      const f: Finish = { id: slug, slug, name: String(b.name).trim(), order: m.finishes.length, products: [] };
      m.finishes.push(f);
      return f;
    });
    revalidateAll();
    return NextResponse.json({ ok: true, finish });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const b = await req.json().catch(() => null);

    // Side effect resolved BEFORE the mutation, so a compare-and-set retry never repeats it.
    let cardImageUrl: string | undefined;
    if (b?.cardImage && typeof b.cardImage.publicId === "string") {
      const res = await getImageResource(b.cardImage.publicId, "c1");
      if (res) cardImageUrl = res.url;
    }

    const { result: finish } = await mutateManifest((m) => {
      const f = m.finishes.find((x) => x.id === b?.id);
      if (!f) throw new AbortMutation(404, "Finish not found.");
      if (typeof b.name === "string" && b.name.trim()) f.name = b.name.trim();
      if (typeof b.order === "number") f.order = b.order;
      if (cardImageUrl) f.cardImage = cardImageUrl;
      m.finishes.sort((a, z) => a.order - z.order);
      return f;
    });
    revalidateAll();
    return NextResponse.json({ ok: true, finish });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const b = await req.json().catch(() => null);

    // The mutation only removes the finish and reports which images are now orphaned;
    // the irreversible Cloudinary deletes happen afterwards, once the write has committed.
    const { result: orphaned } = await mutateManifest((m) => {
      const f = m.finishes.find((x) => x.id === b?.id);
      if (!f) throw new AbortMutation(404, "Finish not found.");
      const images: ProductImage[] = f.products.flatMap((p) => p.images);
      m.finishes = m.finishes.filter((x) => x.id !== b?.id);
      return images;
    });

    for (const im of orphaned)
      await destroyImage(im.publicId, cloudForUrl(im.url)).catch((err) => console.error(`[chayamukhi] destroyImage failed for ${im.publicId}:`, err?.message ?? err));

    revalidateAll();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
