"use client";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEFAULT_SEARCHES, searchItems, type SearchItem } from "@/lib/search";
import { formatINR } from "@/lib/format";
import { IconSearch, IconClose } from "./icons";

// One download per page visit, shared by every search box on the page.
let indexPromise: Promise<SearchItem[]> | null = null;
function loadIndex(): Promise<SearchItem[]> {
  if (!indexPromise) {
    indexPromise = fetch("/api/search")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => (Array.isArray(d) ? (d as SearchItem[]) : []))
      .catch(() => { indexPromise = null; return []; });
  }
  return indexPromise;
}

// Small square thumbnail straight from Cloudinary, so the dropdown never pulls full-size photos.
const thumb = (url?: string) => (url && url.includes("/upload/") ? url.replace("/upload/", "/upload/f_auto,q_auto,w_96,h_96,c_fill/") : url);

const MAX_SUGGESTIONS = 6;

export default function SearchBox({ variant, autoFocus, onDone }: { variant: "hero" | "overlay"; autoFocus?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [hi, setHi] = useState(-1);
  const [tick, setTick] = useState(0);

  // Rotating example in the placeholder: "Search “Jhumkas”", "Search “Bangles”", …
  useEffect(() => {
    if (q || open) return;
    const t = setInterval(() => setTick((n) => n + 1), 2600);
    return () => clearInterval(t);
  }, [q, open]);
  const example = DEFAULT_SEARCHES[tick % DEFAULT_SEARCHES.length];

  useEffect(() => { if (autoFocus) { loadIndex().then(setItems); } }, [autoFocus]);

  // Close on a tap outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const term = q.trim();
  const results = useMemo(() => (term && items ? searchItems(items, term, MAX_SUGGESTIONS) : []), [items, term]);
  useEffect(() => setHi(-1), [term]);

  const go = (href: string) => { setOpen(false); setQ(""); onDone?.(); router.push(href); };
  const shopFor = (t: string) => `/shop?q=${encodeURIComponent(t)}`;

  // Rows the arrow keys move through: products, then "see all".
  const rowCount = term ? results.length + 1 : DEFAULT_SEARCHES.length;
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi((h) => (h + 1) % rowCount); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => (h <= 0 ? rowCount - 1 : h - 1)); }
    else if (e.key === "Escape") { if (open) { setOpen(false); } else { onDone?.(); } }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (!term) { go(hi >= 0 ? shopFor(DEFAULT_SEARCHES[hi]) : "/shop"); return; }
      if (hi >= 0 && hi < results.length) go(`/product?slug=${results[hi].s}`);
      else go(shopFor(term));
    }
  };

  const hero = variant === "hero";
  return (
    <div ref={wrapRef} className={`relative w-full ${hero ? "mx-auto max-w-md" : ""}`}>
      <form
        role="search"
        onSubmit={(e) => { e.preventDefault(); go(term ? shopFor(term) : "/shop"); }}
        className={hero
          ? "flex items-center gap-2 rounded-full border border-black/10 bg-white py-1 pl-4 pr-1 shadow-[0_4px_16px_rgba(28,25,23,0.10)] transition focus-within:border-gold"
          : "flex items-center gap-3 border-b border-black/20 pb-1 focus-within:border-gold"}
      >
        <IconSearch className="shrink-0 text-gold" width={hero ? 16 : 22} height={hero ? 16 : 22} />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); loadIndex().then(setItems); }}
          onKeyDown={onKey}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          aria-label="Search jewellery by name or code"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={`Search “${example}”`}
          className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-gray-400 [&::-webkit-search-cancel-button]:hidden ${hero ? "py-1 text-sm" : "py-2 text-lg"}`}
        />
        {q ? (
          <button type="button" aria-label="Clear search" onClick={() => { setQ(""); inputRef.current?.focus(); }} className="shrink-0 p-1 text-gray-400 hover:text-ink">
            <IconClose width={16} height={16} />
          </button>
        ) : null}
        {hero ? (
          <button type="submit" className="shrink-0 rounded-full bg-ink px-4 py-1.5 text-[10px] uppercase tracking-widest text-white transition hover:bg-gold">Search</button>
        ) : null}
      </form>

      {open ? (
        <div id={listId} role="listbox" className={`absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white text-left shadow-xl ${hero ? "" : "max-h-[70vh] overflow-y-auto"}`}>
          {!term ? (
            <div className="p-4">
              <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-gray-400">Popular searches</p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_SEARCHES.map((s, i) => (
                  <button key={s} type="button" role="option" aria-selected={hi === i} onClick={() => go(shopFor(s))}
                    className={`rounded-full border px-3.5 py-1.5 text-xs transition ${hi === i ? "border-ink bg-ink text-white" : "border-black/15 text-ink hover:border-gold hover:text-gold"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="py-1">
              {items === null ? <li className="px-4 py-3 text-sm text-gray-400">Searching…</li> : null}
              {items !== null && !results.length ? (
                <li className="px-4 py-3 text-sm text-gray-500">No pieces match “{term}”. Try a shorter word or a product code.</li>
              ) : null}
              {results.map((r, i) => (
                <li key={r.s} role="option" aria-selected={hi === i}>
                  <Link href={`/product?slug=${r.s}`} onClick={() => { setOpen(false); setQ(""); onDone?.(); }} onMouseEnter={() => setHi(i)}
                    className={`flex items-center gap-3 px-4 py-2.5 ${hi === i ? "bg-cream" : ""}`}>
                    <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-sand">
                      {r.i ? <img src={thumb(r.i)} alt="" width={44} height={44} loading="lazy" className="h-full w-full object-cover" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-sm text-ink">{r.n}</span>
                      <span className="mt-0.5 block text-[10px] uppercase tracking-widest text-gray-400">{[r.c, r.t].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm">{formatINR(r.p)}</span>
                      {r.x ? <span className="mt-0.5 block text-[9px] uppercase tracking-widest text-gray-400">Sold out</span> : null}
                    </span>
                  </Link>
                </li>
              ))}
              <li role="option" aria-selected={hi === results.length}>
                <button type="button" onClick={() => go(shopFor(term))} onMouseEnter={() => setHi(results.length)}
                  className={`flex w-full items-center justify-between border-t border-black/5 px-4 py-3 text-[11px] uppercase tracking-widest text-gold ${hi === results.length ? "bg-cream" : ""}`}>
                  <span>See all results for “{term}”</span>
                  <span aria-hidden>→</span>
                </button>
              </li>
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
