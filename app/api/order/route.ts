import { NextResponse } from "next/server";
import { appendOrder, getManifest } from "@/lib/cloudinary";
import { orderWhatsappUrl, newOrderId } from "@/lib/whatsapp";
import { allProducts, type OrderRecord, type OrderLine } from "@/lib/collections";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.lines?.length || !b?.customer?.name || !b?.customer?.phone) return NextResponse.json({ error: "Invalid order." }, { status: 400 });
  const m = await getManifest();
  const codeById = new Map(allProducts(m).map((p) => [p.id, p.code] as const));
  const lines: OrderLine[] = (b.lines as OrderLine[]).map((l) => ({ ...l, code: codeById.get(l.productId) ?? l.code }));
  const order: OrderRecord = { id: newOrderId(), createdAt: Date.now(), total: Number(b.total) || 0, lines, customer: b.customer };
  await appendOrder(order);
  return NextResponse.json({ ok: true, orderId: order.id, whatsappUrl: orderWhatsappUrl(order) });
}
