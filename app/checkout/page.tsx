"use client";
import React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cart, useCart } from "@/lib/cart";
import { formatINR } from "@/lib/format";

const STATES = ["Andhra Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Odisha","Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","Uttarakhand","West Bengal"];

export default function CheckoutPage() {
  const router = useRouter();
  const lines = useCart();
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", address: "", city: "", state: "Kerala", pincode: "", notes: "" });

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted && lines.length === 0 && !busy) router.replace("/"); }, [mounted, lines.length, busy, router]);

  const subtotal = lines.reduce((s, x) => s + x.price * x.qty, 0);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const res = await fetch("/api/order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total: subtotal,
          lines: lines.map((l) => ({ productId: l.productId, name: l.name, qty: l.qty, price: l.price })),
          customer: {
            name: `${form.firstName} ${form.lastName}`.trim(), phone: form.phone, address: form.address,
            city: form.city, state: form.state, pincode: form.pincode,
            notes: [form.email ? `Email: ${form.email}` : "", form.notes].filter(Boolean).join(" | ") || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.whatsappUrl) throw new Error(data.error || "Could not place order.");
      cart.clear();
      window.location.href = data.whatsappUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  };

  if (!mounted || lines.length === 0) return null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-8 font-serif text-3xl text-ink">Checkout</h1>
      <form onSubmit={placeOrder} className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <h2 className="mb-4 text-[11px] uppercase tracking-widest text-gray-500">Delivery Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" required value={form.firstName} onChange={set("firstName")} />
            <Field label="Last name" value={form.lastName} onChange={set("lastName")} />
            <Field label="WhatsApp number" type="tel" required value={form.phone} onChange={set("phone")} />
            <Field label="Email (optional)" type="email" value={form.email} onChange={set("email")} />
          </div>
          <div className="mt-4">
            <label className="block text-sm">
              <span className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">Address</span>
              <textarea required rows={3} value={form.address} onChange={set("address")} className="w-full rounded border border-black/15 px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="City" required value={form.city} onChange={set("city")} />
            <label className="block text-sm">
              <span className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">State</span>
              <select value={form.state} onChange={set("state")} className="w-full rounded border border-black/15 px-3 py-2 text-sm">
                {STATES.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </label>
            <Field label="Pincode" required value={form.pincode} onChange={set("pincode")} />
          </div>
          <div className="mt-4">
            <label className="block text-sm">
              <span className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">Order notes (optional)</span>
              <textarea rows={2} value={form.notes} onChange={set("notes")} className="w-full rounded border border-black/15 px-3 py-2 text-sm" />
            </label>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-[11px] uppercase tracking-widest text-gray-500">Order Summary</h2>
          <div className="rounded-lg border border-black/10 p-5">
            <ul className="divide-y divide-black/5">
              {lines.map((l) => (
                <li key={l.productId} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="line-clamp-1">{l.name} × {l.qty}</span>
                  <span className="shrink-0">{formatINR(l.price * l.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-2 border-t border-black/10 pt-4 text-sm">
              <Row label="Subtotal" value={formatINR(subtotal)} />
              <Row label="Shipping" value="Confirmed on WhatsApp" />
              <div className="flex items-center justify-between border-t border-black/10 pt-3 text-base font-medium">
                <span>Total</span><span>{formatINR(subtotal)}</span>
              </div>
            </div>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            <button type="submit" disabled={busy} className="mt-5 w-full rounded-full bg-[#25D366] py-3 text-[11px] uppercase tracking-widest text-white transition hover:opacity-90 disabled:opacity-50">
              {busy ? "Placing order…" : "Place Order via WhatsApp"}
            </button>
            <p className="mt-3 text-center text-[11px] text-gray-500">You&rsquo;ll be redirected to WhatsApp to confirm your order and arrange payment.</p>
            <Link href="/shop" className="mt-3 block text-center text-[11px] uppercase tracking-widest text-gray-400 hover:text-gold">Continue shopping</Link>
          </div>
        </div>
      </form>
    </main>
  );
}

function Field({ label, required, type = "text", value, onChange }: { label: string; required?: boolean; type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">{label}</span>
      <input type={type} required={required} value={value} onChange={onChange} className="w-full rounded border border-black/15 px-3 py-2 text-sm" />
    </label>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (<div className="flex items-center justify-between text-gray-600"><span>{label}</span><span>{value}</span></div>);
}
