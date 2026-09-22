import { randomBytes } from "crypto";
import { BRAND } from "@/config/brand";
import type { OrderRecord } from "@/lib/collections";
const money = (n: number) => `${BRAND.currencySymbol}${n.toLocaleString("en-IN")}`;

export function buildOrderMessage(order: OrderRecord): string {
  const lines = order.lines.map((l) => `• ${l.name} × ${l.qty} — ${money(l.price * l.qty)}\n  Product code: ${l.code ?? l.productId}`).join("\n");
  const c = order.customer;
  const subtotal = order.subtotal ?? order.lines.reduce((s, l) => s + l.price * l.qty, 0);
  const delivery = order.delivery ?? Math.max(0, order.total - subtotal);
  return [`*New order — ${BRAND.name}*`, ``, lines, ``, `Subtotal: ${money(subtotal)}`, `Delivery: ${delivery > 0 ? money(delivery) : "Free"}`, `*Total: ${money(order.total)}*`, ``,
    `*Deliver to*`, c.name, c.phone, c.address, `${c.city}, ${c.state} - ${c.pincode}`, c.notes ? `Notes: ${c.notes}` : ``]
    .filter(Boolean).join("\n");
}
export function orderWhatsappUrl(order: OrderRecord): string { return `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(buildOrderMessage(order))}`; }

/**
 * Order ids are now storage keys, so they must be collision-resistant and
 * unambiguous when a customer reads one off WhatsApp. 10 chars from a 31-symbol
 * alphabet (no I/L/O/0/1) drawn from a CSPRNG — ~10^15 combinations, versus the
 * old 6 chars of Math.random().
 */
export function newOrderId(): string {
  const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(10);
  let s = "";
  for (let i = 0; i < 10; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return `ORD-${s}`;
}
