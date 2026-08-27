"use client";
import React from "react";
import { useState } from "react";
import { formatINR } from "@/lib/format";
import type { OrderRecord } from "@/lib/collections";

export default function TrackPage() {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setOrder(null); setBusy(true);
    try {
      const res = await fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, phone }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order not found.");
      setOrder(data.order as OrderRecord);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order not found.");
    } finally { setBusy(false); }
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-serif text-3xl text-ink">Track Your Order</h1>
      <p className="mt-2 text-sm text-gray-500">Enter your order number (ORD-XXXXXX) and the phone number used at checkout.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ORD-XXXXXX" className="w-full rounded border border-black/15 px-3 py-2.5 text-sm" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="w-full rounded border border-black/15 px-3 py-2.5 text-sm" />
        <button type="submit" disabled={busy} className="w-full rounded-full bg-ink py-3 text-[11px] uppercase tracking-widest text-white disabled:opacity-50">{busy ? "Searching…" : "Track Order"}</button>
      </form>
      {error ? <p className="mt-5 text-sm text-red-600">{error}</p> : null}
      {order ? (
        <div className="mt-8 rounded-lg border border-black/10 p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{order.id}</span>
            <span className="text-gray-500">{new Date(order.createdAt).toLocaleDateString("en-IN")}</span>
          </div>
          <ul className="mt-4 divide-y divide-black/5">
            {order.lines.map((l, i) => (<li key={i} className="flex justify-between py-2 text-sm"><span>{l.name} × {l.qty}</span><span>{formatINR(l.price * l.qty)}</span></li>))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-black/10 pt-3 text-sm font-medium"><span>Total</span><span>{formatINR(order.total)}</span></div>
          <p className="mt-4 text-xs text-gray-500">Delivering to {order.customer.city}, {order.customer.state} — {order.customer.pincode}. For updates, message us on WhatsApp with your order number.</p>
        </div>
      ) : null}
    </main>
  );
}
