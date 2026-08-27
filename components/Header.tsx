"use client";
import React, { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { NAV, BRAND } from "@/config/brand";
import { useCart } from "@/lib/cart";
import SearchOverlay from "./SearchOverlay";
import { IconSearch, IconCart, IconMenu, IconClose, IconChevron } from "./icons";

type FinishLite = { id: string; slug: string; name: string };

function navActive(href: string, pathname: string, sp: { get(n: string): string | null }): boolean {
  const [p, q] = href.split("?");
  if (p !== pathname) return false;
  if (!q) {
    if (p === "/shop") return !sp.get("finish") && !sp.get("type") && !sp.get("sort") && !sp.get("view") && !sp.get("q");
    return true;
  }
  const [k, v] = q.split("=");
  return sp.get(k) === v;
}

function DesktopNav({ finishes }: { finishes: FinishLite[] }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <nav className="hidden items-center gap-6 text-xs uppercase tracking-[0.12em] md:flex">
      {NAV.map((n) => {
        const active = navActive(n.href, pathname, sp);
        return (
          <div key={n.href} className="group relative">
            <Link href={n.href} className={`flex items-center gap-1 py-2 transition ${active ? "text-gold underline underline-offset-8 decoration-2" : "text-ink hover:text-gold"}`}>
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
        );
      })}
    </nav>
  );
}

function MobileNav({ finishes, onNavigate }: { finishes: FinishLite[]; onNavigate: () => void }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <nav className="flex flex-col gap-1 text-sm">
      {NAV.map((n) => {
        const active = navActive(n.href, pathname, sp);
        return (
          <Link key={n.href} href={n.href} onClick={onNavigate} className={`rounded px-2 py-2 ${active ? "bg-cream text-gold" : "text-ink hover:bg-cream"}`}>{n.label}</Link>
        );
      })}
      <div className="mt-3 border-t border-black/10 pt-3 text-[11px] uppercase tracking-widest text-gray-500">Finishes</div>
      {finishes.map((f) => (
        <Link key={f.id} href={`/shop?finish=${f.slug}`} onClick={onNavigate} className="rounded px-2 py-1.5 text-sm hover:bg-cream">{f.name}</Link>
      ))}
    </nav>
  );
}

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
        <Link href="/" className="font-serif text-lg tracking-[0.15em] text-ink sm:text-xl md:text-2xl md:tracking-[0.25em]">{BRAND.name}</Link>
        <Suspense fallback={<div className="hidden md:block" />}>
          <DesktopNav finishes={finishes} />
        </Suspense>
        <div className="flex items-center gap-3 text-ink">
          <button aria-label="Search" className="p-1 hover:text-gold" onClick={() => setSearch(true)}><IconSearch /></button>
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
            <Suspense fallback={null}>
              <MobileNav finishes={finishes} onNavigate={() => setMobile(false)} />
            </Suspense>
          </div>
        </div>
      ) : null}
      {search ? <SearchOverlay onClose={() => setSearch(false)} /> : null}
    </header>
  );
}
