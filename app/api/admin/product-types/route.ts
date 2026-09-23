import { NextResponse } from "next/server";
import { mutateManifest, AbortMutation } from "@/lib/cloudinary";
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
