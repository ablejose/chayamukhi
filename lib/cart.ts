"use client";
import { useSyncExternalStore } from "react";

export interface CartLine { productId: string; slug: string; name: string; price: number; image: string; qty: number; }
const KEY = "chayamukhi_cart";
const EMPTY: CartLine[] = [];

// Cached snapshot so useSyncExternalStore gets a STABLE reference between
// renders (returning a fresh JSON.parse array every call triggers an
// infinite render loop / "Maximum update depth exceeded").
let cache: CartLine[] = EMPTY;
let cacheRaw: string | null = null;

function read(): CartLine[] {
  if (typeof window === "undefined") return EMPTY;
  let raw = "[]";
  try { raw = localStorage.getItem(KEY) || "[]"; } catch { raw = "[]"; }
  if (raw === cacheRaw) return cache;
  let parsed: CartLine[];
  try { const j = JSON.parse(raw); parsed = Array.isArray(j) ? (j as CartLine[]) : []; } catch { parsed = []; }
  cache = parsed;
  cacheRaw = raw;
  return cache;
}

function write(lines: CartLine[]) {
  const raw = JSON.stringify(lines);
  try { localStorage.setItem(KEY, raw); } catch {}
  cache = lines;      // new reference on every mutation → React re-renders
  cacheRaw = raw;
  window.dispatchEvent(new Event("cart:changed"));
}

export const cart = {
  get: read,
  add(line: Omit<CartLine, "qty">, qty = 1) {
    const l = read().slice();
    const i = l.findIndex((x) => x.productId === line.productId);
    if (i >= 0) l[i] = { ...l[i], qty: l[i].qty + qty };
    else l.push({ ...line, qty });
    write(l);
    try { window.dispatchEvent(new CustomEvent("cart:added", { detail: { name: line.name } })); } catch {}
  },
  setQty(id: string, qty: number) { write(read().map((x) => (x.productId === id ? { ...x, qty } : x)).filter((x) => x.qty > 0)); },
  remove(id: string) { write(read().filter((x) => x.productId !== id)); },
  clear() { write([]); },
  total() { return read().reduce((s, x) => s + x.price * x.qty, 0); },
  count() { return read().reduce((s, x) => s + x.qty, 0); },
};

function subscribe(cb: () => void) {
  window.addEventListener("cart:changed", cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener("cart:changed", cb); window.removeEventListener("storage", cb); };
}

export function useCart() { return useSyncExternalStore(subscribe, read, () => EMPTY); }
