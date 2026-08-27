import { NextResponse } from "next/server";
import { getManifest, saveManifest } from "@/lib/cloudinary";
import { revalidatePath } from "next/cache";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const m = await getManifest({ fresh: true });
  m.announcement = { text: typeof b?.text === "string" ? b.text : "", active: !!b?.active };
  await saveManifest(m); revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, announcement: m.announcement });
}
