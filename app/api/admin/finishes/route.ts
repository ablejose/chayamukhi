import { NextResponse } from "next/server";
import { getManifest, saveManifest, getImageResource, destroyImage, cloudForUrl } from "@/lib/cloudinary";
import { slugify, type Finish } from "@/lib/collections";
import { revalidatePath } from "next/cache";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const revalidateAll = () => revalidatePath("/", "layout");

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.name) return NextResponse.json({ error: "Missing name." }, { status: 400 });
  const m = await getManifest({ fresh: true });
  const slug = slugify(String(b.name));
  if (m.finishes.some((f) => f.id === slug)) return NextResponse.json({ error: "Finish already exists." }, { status: 409 });
  const finish: Finish = { id: slug, slug, name: String(b.name).trim(), order: m.finishes.length, products: [] };
  m.finishes.push(finish);
  await saveManifest(m); revalidateAll();
  return NextResponse.json({ ok: true, finish });
}

export async function PATCH(req: Request) {
  const b = await req.json().catch(() => null);
  const m = await getManifest({ fresh: true });
  const finish = m.finishes.find((f) => f.id === b?.id);
  if (!finish) return NextResponse.json({ error: "Finish not found." }, { status: 404 });
  if (typeof b.name === "string" && b.name.trim()) finish.name = b.name.trim();
  if (typeof b.order === "number") finish.order = b.order;
  if (b.cardImage && typeof b.cardImage.publicId === "string") {
    const res = await getImageResource(b.cardImage.publicId, "c1");
    if (res) finish.cardImage = res.url;
  }
  m.finishes.sort((a, z) => a.order - z.order);
  await saveManifest(m); revalidateAll();
  return NextResponse.json({ ok: true, finish });
}

export async function DELETE(req: Request) {
  const b = await req.json().catch(() => null);
  const m = await getManifest({ fresh: true });
  const finish = m.finishes.find((f) => f.id === b?.id);
  if (!finish) return NextResponse.json({ error: "Finish not found." }, { status: 404 });
  m.finishes = m.finishes.filter((f) => f.id !== b?.id);
  await saveManifest(m);
  for (const p of finish.products) for (const im of p.images) await destroyImage(im.publicId, cloudForUrl(im.url)).catch(() => {});
  revalidateAll();
  return NextResponse.json({ ok: true });
}
