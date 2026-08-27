import { NextResponse } from "next/server";
import { getManifest, saveManifest } from "@/lib/cloudinary";
import { slugify, type TypeDef } from "@/lib/collections";
import { revalidatePath } from "next/cache";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const revalidateAll = () => revalidatePath("/", "layout");

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.name) return NextResponse.json({ error: "Missing name." }, { status: 400 });
  const m = await getManifest({ fresh: true });
  const slug = slugify(String(b.name));
  if (m.productTypes.some((t) => t.id === slug)) return NextResponse.json({ error: "Type already exists." }, { status: 409 });
  const type: TypeDef = { id: slug, slug, name: String(b.name).trim(), order: m.productTypes.length };
  m.productTypes.push(type);
  await saveManifest(m); revalidateAll();
  return NextResponse.json({ ok: true, type });
}

export async function DELETE(req: Request) {
  const b = await req.json().catch(() => null);
  const m = await getManifest({ fresh: true });
  m.productTypes = m.productTypes.filter((t) => t.id !== b?.id);
  await saveManifest(m); revalidateAll();
  return NextResponse.json({ ok: true });
}
