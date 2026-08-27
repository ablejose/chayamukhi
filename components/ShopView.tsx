"use client";
import React from "react";
import { useMemo, useState } from "react";
import type { Product, TypeDef } from "@/lib/collections";
import ProductCard from "./ProductCard";
import { IconChevron } from "./icons";

type FinishLite = { id: string; slug: string; name: string };
type Initial = { finish?: string; type?: string; sort?: string; q?: string; view?: string };

export default function ShopView({
  products, finishes, types, initial,
}: { products: Product[]; finishes: FinishLite[]; types: TypeDef[]; initial: Initial }) {
  const [finish, setFinish] = useState<string>(initial.finish ?? "");
  const [type, setType] = useState<string>(initial.type ?? "");
  const [sort, setSort] = useState<string>(initial.sort === "new" ? "new" : initial.sort ?? "new");
  const [q] = useState<string>(initial.q ?? "");
  const maxPriceAvail = useMemo(() => Math.max(1000, ...products.map((p) => p.price)), [products]);
  const [maxPrice, setMaxPrice] = useState<number>(maxPriceAvail);
  const [openFilters, setOpenFilters] = useState(false);

  const filtered = useMemo(() => {
    let list = products.slice();
    if (finish) list = list.filter((p) => p.finishId === finish);
    if (type) list = list.filter((p) => p.typeId === type);
    if (q) { const t = q.toLowerCase(); list = list.filter((p) => p.name.toLowerCase().includes(t)); }
    list = list.filter((p) => p.price <= maxPrice);
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }, [products, finish, type, q, sort, maxPrice]);

  const finishName = finishes.find((f) => f.slug === finish || f.id === finish)?.name;
  const typeName = types.find((t) => t.slug === type || t.id === type)?.name;
  const title = q ? `Search: “${q}”` : finishName ?? typeName ?? (initial.sort === "new" ? "New In" : "Shop All");

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-ink">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{filtered.length} {filtered.length === 1 ? "piece" : "pieces"}</p>
      </div>

      {/* Type pills (AXIS 2) — instant client-side filtering, no reload */}
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        <Pill active={type === ""} onClick={() => setType("")}>All</Pill>
        {types.map((t) => (
          <Pill key={t.id} active={type === t.slug || type === t.id} onClick={() => setType(t.slug)}>{t.name}</Pill>
        ))}
      </div>

      {/* Collapsible filter rail: finish + price + sort */}
      <div className="mb-8 rounded-lg border border-black/10">
        <button onClick={() => setOpenFilters((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-[11px] uppercase tracking-widest text-gray-600">
          Filters &amp; Sort
          <IconChevron className={openFilters ? "rotate-180 transition" : "transition"} width={16} height={16} />
        </button>
        {openFilters ? (
          <div className="grid gap-5 border-t border-black/10 px-4 py-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">Finish</span>
              <select value={finish} onChange={(e) => setFinish(e.target.value)} className="w-full rounded border border-black/15 px-3 py-2 text-sm">
                <option value="">All finishes</option>
                {finishes.map((f) => (<option key={f.id} value={f.slug}>{f.name}</option>))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">Max price: ₹{maxPrice.toLocaleString("en-IN")}</span>
              <input type="range" min={0} max={maxPriceAvail} step={50} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-[#b8860b]" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full rounded border border-black/15 px-3 py-2 text-sm">
                <option value="new">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </label>
          </div>
        ) : null}
      </div>

      {filtered.length ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (<ProductCard key={p.id} p={p} />))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-black/15 py-20 text-center text-sm text-gray-400">No products match these filters yet.</p>
      )}
    </main>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`whitespace-nowrap rounded-full border px-4 py-2 text-[11px] uppercase tracking-widest transition ${active ? "border-ink bg-ink text-white" : "border-black/15 text-ink hover:border-ink"}`}>
      {children}
    </button>
  );
}
