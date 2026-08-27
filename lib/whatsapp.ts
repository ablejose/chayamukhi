import { BRAND } from "@/config/brand";
import type { OrderRecord } from "@/lib/collections";
const money = (n: number) => `${BRAND.currencySymbol}${n.toLocaleString("en-IN")}`;

export function buildOrderMessage(order: OrderRecord): string {
  const lines = order.lines.map((l) => `• ${l.name} × ${l.qty} — ${money(l.price * l.qty)}`).join("\n");
  const c = order.customer;
  return [`*New order — ${BRAND.name}*`, `Order: ${order.id}`, ``, lines, ``, `*Total: ${money(order.total)}*`, ``,
    `*Deliver to*`, c.name, c.phone, c.address, `${c.city}, ${c.state} - ${c.pincode}`, c.notes ? `Notes: ${c.notes}` : ``]
    .filter(Boolean).join("\n");
}
export function orderWhatsappUrl(order: OrderRecord): string { return `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(buildOrderMessage(order))}`; }
export function newOrderId(): string { return "ORD-" + Math.random().toString(36).slice(2, 8).toUpperCase(); }
