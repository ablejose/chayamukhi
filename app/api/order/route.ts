import { NextResponse } from "next/server";
import { appendOrder, getManifest } from "@/lib/cloudinary";
import { orderWhatsappUrl, newOrderId } from "@/lib/whatsapp";
import { allProducts, type OrderRecord, type OrderLine } from "@/lib/collections";
import { deliveryFor } from "@/lib/delivery";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.lines?.length || !b?.customer?.name || !b?.customer?.phone) return NextResponse.json({ error: "Invalid order." }, { status: 400 });
  const m = await getManifest();
  const codeById = new Map(allProducts(m).map((p) => [p.id, p.code] as const));
  const lines: OrderLine[] = (b.lines as OrderLine[]).map((l) => ({ ...l, code: codeById.get(l.productId) ?? l.code }));
  const subtotal = lines.reduce((s, l) => s + (Number(l.price) || 0) * (Number(l.qty) || 0), 0);
  const delivery = deliveryFor(subtotal).fee;
  const total = subtotal + delivery;
  const order: OrderRecord = { id: newOrderId(), createdAt: Date.now(), subtotal, delivery, total, lines, customer: b.customer };
  await appendOrder(order);
  return NextResponse.json({ ok: true, orderId: order.id, whatsappUrl: orderWhatsappUrl(order) });
}
