import { NextResponse } from "next/server";
import { putOrder, orderIdTaken, getManifest } from "@/lib/cloudinary";
import { orderWhatsappUrl, newOrderId } from "@/lib/whatsapp";
import { allProducts, type OrderRecord, type OrderLine } from "@/lib/collections";
import { deliveryFor } from "@/lib/delivery";
import { errorResponse } from "@/lib/apiError";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";

/** The order id is now a storage key, so never hand out one that is already taken. */
async function allocateOrderId(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const id = newOrderId();
    if (!(await orderIdTaken(id))) return id;
  }
  throw new Error("Could not allocate an order number. Please try again.");
}

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null);
    if (!b?.lines?.length || !b?.customer?.name || !b?.customer?.phone) return NextResponse.json({ error: "Invalid order." }, { status: 400 });

    const m = await getManifest();
    const codeById = new Map(allProducts(m).map((p) => [p.id, p.code] as const));
    const lines: OrderLine[] = (b.lines as OrderLine[]).map((l) => ({ ...l, code: codeById.get(l.productId) ?? l.code }));
    const subtotal = lines.reduce((s, l) => s + (Number(l.price) || 0) * (Number(l.qty) || 0), 0);
    const delivery = deliveryFor(subtotal).fee;
    const total = subtotal + delivery;

    const order: OrderRecord = { id: await allocateOrderId(), createdAt: Date.now(), subtotal, delivery, total, lines, customer: b.customer };

    // One object per order — two simultaneous checkouts write different keys and
    // cannot overwrite one another. If this throws we return an error instead of
    // a success, so the storefront keeps the cart rather than silently losing it.
    await putOrder(order);

    return NextResponse.json({ ok: true, orderId: order.id, whatsappUrl: orderWhatsappUrl(order) });
  } catch (e) {
    return errorResponse(e);
  }
}
