"use client";
import React, { Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { NAV, BRAND } from "@/config/brand";
import { useCart } from "@/lib/cart";
import SearchOverlay from "./SearchOverlay";
import { IconSearch, IconCart, IconMenu, IconClose, IconChevron } from "./icons";

type FinishLite = { id: string; slug: string; name: string };
type SubItem = { label: string; href: string };

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

// Sub-menu items for the two "browse" nav entries.
function subItemsFor(href: string, finishes: FinishLite[], types: FinishLite[]): SubItem[] | null {
  if (href === "/finish") return finishes.map((f) => ({ label: f.name, href: `/shop?finish=${f.slug}` }));
  if (href === "/category") return types.map((t) => ({ label: t.name, href: `/shop?type=${t.slug}` }));
  return null;
}

function DesktopNav({ finishes, types }: { finishes: FinishLite[]; types: FinishLite[] }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <nav className="hidden items-center gap-6 text-xs uppercase tracking-[0.12em] md:flex">
      {NAV.map((n) => {
        const active = navActive(n.href, pathname, sp);
        const items = subItemsFor(n.href, finishes, types);
        return (
          <div key={n.href} className="group relative">
            <Link href={n.href} className={`flex items-center gap-1 py-2 transition ${active ? "text-gold underline underline-offset-8 decoration-2" : "text-ink hover:text-gold"}`}>
              {n.label}
              {items ? <IconChevron width={14} height={14} /> : null}
            </Link>
            {items ? (
              <div className="invisible absolute left-1/2 top-full z-50 max-h-[70vh] w-64 -translate-x-1/2 overflow-y-auto rounded-md border border-black/10 bg-white p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
                {items.map((it) => (
                  <Link key={it.href} href={it.href} className="block rounded px-3 py-2 text-[11px] hover:bg-cream">{it.label}</Link>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function MobileNav({ finishes, types, onNavigate }: { finishes: FinishLite[]; types: FinishLite[]; onNavigate: () => void }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const subActive = (href: string) => {
    const [pp, qq] = href.split("?");
    if (pp !== pathname || !qq) return false;
    const [k, v] = qq.split("=");
    return sp.get(k) === v;
  };
  return (
    <nav className="flex flex-col gap-1 text-sm">
      {NAV.map((n) => {
        const active = navActive(n.href, pathname, sp);
        const items = subItemsFor(n.href, finishes, types);
        if (!items) {
          return (
            <Link key={n.href} href={n.href} onClick={onNavigate} className={`rounded px-2 py-2.5 ${active ? "bg-cream text-gold" : "text-ink hover:bg-cream"}`}>{n.label}</Link>
          );
        }
        const expanded = openKey === n.href;
        return (
          <div key={n.href}>
            <div className={`flex items-center justify-between rounded ${active ? "bg-cream" : ""}`}>
              <Link href={n.href} onClick={onNavigate} className={`flex-1 rounded px-2 py-2.5 ${active ? "text-gold" : "text-ink hover:bg-cream"}`}>{n.label}</Link>
              <button type="button" aria-label={`Toggle ${n.label}`} aria-expanded={expanded} onClick={() => setOpenKey(expanded ? null : n.href)} className="px-2 py-2.5 text-ink">
                <IconChevron className={expanded ? "rotate-180 transition" : "transition"} width={16} height={16} />
              </button>
            </div>
            {expanded ? (
              <div className="mb-1 ml-2 flex flex-col gap-0.5 border-l border-black/10 pl-3">
                {items.map((it) => (
                  <Link key={it.href} href={it.href} onClick={onNavigate} className={`rounded px-2 py-1.5 text-[13px] ${subActive(it.href) ? "text-gold" : "text-ink hover:bg-cream"}`}>{it.label}</Link>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function MobileDrawer({ open, onClose, finishes, types }: { open: boolean; onClose: () => void; finishes: FinishLite[]; types: FinishLite[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(
    <div className={`fixed inset-0 z-[70] md:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div role="dialog" aria-modal="true" className={`absolute left-0 top-0 flex h-full w-72 max-w-[82%] flex-col bg-white p-5 shadow-2xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-6 flex items-center justify-between">
          <span className="font-serif tracking-[0.25em]">{BRAND.name}</span>
          <button aria-label="Close menu" onClick={onClose}><IconClose /></button>
        </div>
        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          <Suspense fallback={null}>
            <MobileNav finishes={finishes} types={types} onNavigate={onClose} />
          </Suspense>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function Header({ finishes, types }: { finishes: FinishLite[]; types: FinishLite[] }) {
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
          <DesktopNav finishes={finishes} types={types} />
        </Suspense>
        <div className="flex items-center gap-3 text-ink">
          <button aria-label="Search" className="p-1 hover:text-gold" onClick={() => setSearch(true)}><IconSearch /></button>
          <button aria-label="Cart" className="relative p-1 hover:text-gold" onClick={openCart}>
            <IconCart />
            {count > 0 ? <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] text-white">{count}</span> : null}
          </button>
        </div>
      </div>
      <MobileDrawer open={mobile} onClose={() => setMobile(false)} finishes={finishes} types={types} />
      {search ? <SearchOverlay onClose={() => setSearch(false)} /> : null}
    </header>
  );
}
