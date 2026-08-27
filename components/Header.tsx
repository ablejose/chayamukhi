"use client";
import Link from "next/link";
import { useState } from "react";
import { NAV, BRAND } from "@/config/brand";
import { useCart } from "@/lib/cart";
import SearchOverlay from "./SearchOverlay";
import { IconSearch, IconUser, IconCart, IconMenu, IconClose, IconChevron } from "./icons";

type FinishLite = { id: string; slug: string; name: string };

export default function Header({ finishes }: { finishes: FinishLite[] }) {
  const lines = useCart();
  const count = lines.reduce((s, x) => s + x.qty, 0);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);

  const openCart = () => window.dispatchEvent(new Event("cart:open"));

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
        <button className="p-1 md:hidden" aria-label="Open menu" onClick={() => setMobile(true)}><IconMenu /></button>

        <Link href="/" className="font-serif text-xl tracking-[0.25em] text-ink md:text-2xl">{BRAND.name}</Link>

        <nav className="hidden items-center gap-6 text-xs uppercase tracking-[0.12em] text-ink md:flex">
          {NAV.map((n) => (
            <div key={n.href} className="group relative">
              <Link href={n.href} className="flex items-center gap-1 py-2 hover:text-gold">
                {n.label}
                {n.label === "By Metal & Finish" ? <IconChevron width={14} height={14} /> : null}
              </Link>
              {n.label === "By Metal & Finish" ? (
                <div className="invisible absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 rounded-md border border-black/10 bg-white p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
                  {finishes.map((f) => (
                    <Link key={f.id} href={`/shop?finish=${f.slug}`} className="block rounded px-3 py-2 text-[11px] hover:bg-cream">{f.name}</Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-ink">
          <button aria-label="Search" className="p-1 hover:text-gold" onClick={() => setSearch(true)}><IconSearch /></button>
          <Link aria-label="Account" href="/admin/login" className="p-1 hover:text-gold"><IconUser /></Link>
          <button aria-label="Cart" className="relative p-1 hover:text-gold" onClick={openCart}>
            <IconCart />
            {count > 0 ? <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] text-white">{count}</span> : null}
          </button>
        </div>
      </div>

      {mobile ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobile(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[80%] bg-white p-5">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-serif tracking-[0.25em]">{BRAND.name}</span>
              <button aria-label="Close" onClick={() => setMobile(false)}><IconClose /></button>
            </div>
            <nav className="flex flex-col gap-1 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded px-2 py-2 hover:bg-cream" onClick={() => setMobile(false)}>{n.label}</Link>
              ))}
              <div className="mt-3 border-t border-black/10 pt-3 text-[11px] uppercase tracking-widest text-gray-500">Finishes</div>
              {finishes.map((f) => (
                <Link key={f.id} href={`/shop?finish=${f.slug}`} className="rounded px-2 py-1.5 text-sm hover:bg-cream" onClick={() => setMobile(false)}>{f.name}</Link>
              ))}
            </nav>
          </div>
        </div>
      ) : null}

      {search ? <SearchOverlay onClose={() => setSearch(false)} /> : null}
    </header>
  );
}
