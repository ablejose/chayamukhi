"use client";
import { useSyncExternalStore } from "react";
export interface CartLine { productId: string; slug: string; name: string; price: number; image: string; qty: number; }
const KEY = "chayamukhi_cart";
function read(): CartLine[] { if (typeof window === "undefined") return []; try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } }
function write(lines: CartLine[]) { localStorage.setItem(KEY, JSON.stringify(lines)); window.dispatchEvent(new Event("cart:changed")); }
export const cart = {
  get: read,
  add(line: Omit<CartLine, "qty">, qty = 1) { const l = read(); const e = l.find((x) => x.productId === line.productId); if (e) e.qty += qty; else l.push({ ...line, qty }); write(l); },
  setQty(id: string, qty: number) { write(read().map((x) => (x.productId === id ? { ...x, qty } : x)).filter((x) => x.qty > 0)); },
  remove(id: string) { write(read().filter((x) => x.productId !== id)); },
  clear() { write([]); },
  total() { return read().reduce((s, x) => s + x.price * x.qty, 0); },
  count() { return read().reduce((s, x) => s + x.qty, 0); },
};
function subscribe(cb: () => void) { window.addEventListener("cart:changed", cb); window.addEventListener("storage", cb); return () => { window.removeEventListener("cart:changed", cb); window.removeEventListener("storage", cb); }; }
export function useCart() { return useSyncExternalStore(subscribe, read, () => [] as CartLine[]); }
