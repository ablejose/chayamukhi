"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cart, useCart } from "@/lib/cart";
import { formatINR } from "@/lib/format";
import { IconClose, IconMinus, IconPlus, IconTrash } from "./icons";

export default function CartDrawer() {
  const lines = useCart();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("cart:open", onOpen);
    return () => window.removeEventListener("cart:open", onOpen);
  }, []);
  const total = lines.reduce((s, x) => s + x.price * x.qty, 0);
  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
      <div className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={() => setOpen(false)} />
      <aside className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <h3 className="text-sm uppercase tracking-widest">Your Cart ({lines.reduce((s, x) => s + x.qty, 0)})</h3>
          <button aria-label="Close cart" onClick={() => setOpen(false)}><IconClose /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {lines.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-500">Your cart is empty.</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {lines.map((l) => (
                <li key={l.productId} className="flex gap-3 py-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded bg-cream">
                    {l.image ? <img src={l.image} alt={l.name} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <Link href={`/product?slug=${l.slug}`} className="line-clamp-2 text-sm" onClick={() => setOpen(false)}>{l.name}</Link>
                    <span className="mt-1 text-sm text-gray-600">{formatINR(l.price)}</span>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-black/15">
                        <button aria-label="Decrease" className="px-2 py-1" onClick={() => cart.setQty(l.productId, l.qty - 1)}><IconMinus width={14} height={14} /></button>
                        <span className="w-8 text-center text-sm">{l.qty}</span>
                        <button aria-label="Increase" className="px-2 py-1" onClick={() => cart.setQty(l.productId, l.qty + 1)}><IconPlus width={14} height={14} /></button>
                      </div>
                      <button aria-label="Remove" className="text-gray-400 hover:text-red-500" onClick={() => cart.remove(l.productId)}><IconTrash width={16} height={16} /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-black/10 px-5 py-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="uppercase tracking-widest text-gray-500">Total</span>
            <span className="text-lg font-medium">{formatINR(total)}</span>
          </div>
          <Link href="/checkout" onClick={() => setOpen(false)}
            className={`block rounded-full bg-ink py-3 text-center text-xs uppercase tracking-widest text-white ${lines.length === 0 ? "pointer-events-none opacity-40" : "hover:bg-gold"}`}>
            Proceed to Checkout
          </Link>
        </div>
      </aside>
    </div>
  );
}
