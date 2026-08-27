import { NextResponse } from "next/server";
import { findOrder } from "@/lib/cloudinary";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.orderId || !b?.phone) return NextResponse.json({ error: "Enter your order number and phone." }, { status: 400 });
  const order = await findOrder(String(b.orderId), String(b.phone));
  if (!order) return NextResponse.json({ error: "No matching order found." }, { status: 404 });
  return NextResponse.json({ ok: true, order });
}
