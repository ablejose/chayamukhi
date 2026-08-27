import { NextResponse } from "next/server";
import { getManifest } from "@/lib/cloudinary";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function GET() {
  const m = await getManifest({ fresh: true });
  return NextResponse.json(m);
}
