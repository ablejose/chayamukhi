import { NextResponse } from "next/server";
import { appendOrder } from "@/lib/cloudinary";
import { orderWhatsappUrl, newOrderId } from "@/lib/whatsapp";
import type { OrderRecord } from "@/lib/collections";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.lines?.length || !b?.customer?.name || !b?.customer?.phone) return NextResponse.json({ error: "Invalid order." }, { status: 400 });
  const order: OrderRecord = { id: newOrderId(), createdAt: Date.now(), total: Number(b.total) || 0, lines: b.lines, customer: b.customer };
  await appendOrder(order);
  return NextResponse.json({ ok: true, orderId: order.id, whatsappUrl: orderWhatsappUrl(order) });
}
