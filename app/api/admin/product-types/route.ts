import { NextResponse } from "next/server";
import { mutateManifest, AbortMutation, getImageResource } from "@/lib/cloudinary";
import { slugify, type TypeDef } from "@/lib/collections";
import { errorResponse } from "@/lib/apiError";
import { revalidatePath } from "next/cache";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const revalidateAll = () => revalidatePath("/", "layout");

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null);
    if (!b?.name) return NextResponse.json({ error: "Missing name." }, { status: 400 });
    const { result: type } = await mutateManifest((m) => {
      const slug = slugify(String(b.name));
      if (m.productTypes.some((t) => t.id === slug)) throw new AbortMutation(409, "Type already exists.");
      const t: TypeDef = { id: slug, slug, name: String(b.name).trim(), order: m.productTypes.length };
      m.productTypes.push(t);
      return t;
    });
    revalidateAll();
    return NextResponse.json({ ok: true, type });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const b = await req.json().catch(() => null);
    if (!b?.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    // Side effect resolved BEFORE the mutation, so a compare-and-set retry never repeats it.
    let cardImageUrl: string | undefined;
    if (b.cardImage && typeof b.cardImage.publicId === "string") {
      const res = await getImageResource(b.cardImage.publicId, "c1");
      if (!res) return NextResponse.json({ error: "Uploaded image could not be read back from Cloudinary." }, { status: 502 });
      cardImageUrl = res.url;
    }

    const { result: type } = await mutateManifest((m) => {
      const t = m.productTypes.find((x) => x.id === b.id);
      if (!t) throw new AbortMutation(404, "Type not found.");
      if (typeof b.name === "string" && b.name.trim()) t.name = b.name.trim();
      if (typeof b.order === "number") t.order = b.order;
      if (cardImageUrl) t.cardImage = cardImageUrl;
      if (b.cardImage === null) t.cardImage = undefined; // explicit clear -> fall back to the default art
      m.productTypes.sort((a, z) => a.order - z.order);
      return t;
    });

    revalidateAll();
    return NextResponse.json({ ok: true, type });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const b = await req.json().catch(() => null);
    await mutateManifest((m) => {
      m.productTypes = m.productTypes.filter((t) => t.id !== b?.id);
    });
    revalidateAll();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
