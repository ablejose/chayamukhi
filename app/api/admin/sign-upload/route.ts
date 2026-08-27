import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { signUpload } from "@/lib/cloudinary";
import { cloudForId, type CloudKey } from "@/lib/collections";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  let publicId = ""; let which: CloudKey = "c1";
  if (b?.kind === "product") {
    if (typeof b.finishId !== "string" || !/^[a-z0-9-]+$/.test(b.finishId)) return NextResponse.json({ error: "Invalid target." }, { status: 400 });
    const uuid = randomUUID(); publicId = `chayamukhi/products/${b.finishId}/${uuid}`; which = cloudForId(uuid); // EVEN SPREAD
  } else if (b?.kind === "finish-card") {
    if (typeof b.finishId !== "string" || !/^[a-z0-9-]+$/.test(b.finishId)) return NextResponse.json({ error: "Invalid target." }, { status: 400 });
    publicId = `chayamukhi/finishes/${b.finishId}`; which = "c1";
  } else if (b?.kind === "offer") { publicId = `chayamukhi/offers/${randomUUID()}`; which = "c1"; }
  else return NextResponse.json({ error: "Invalid kind." }, { status: 400 });
  return NextResponse.json({ ...signUpload({ public_id: publicId }, which), publicId, cloud: which });
}
