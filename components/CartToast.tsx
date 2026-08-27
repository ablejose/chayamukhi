"use client";
import { useEffect, useRef, useState } from "react";

export default function CartToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const onAdded = (e: Event) => {
      const name = (e as CustomEvent).detail?.name as string | undefined;
      setMsg(name || "Item added");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMsg(null), 3800);
    };
    window.addEventListener("cart:added", onAdded);
    return () => { window.removeEventListener("cart:added", onAdded); if (timer.current) clearTimeout(timer.current); };
  }, []);
  const openCart = () => { window.dispatchEvent(new Event("cart:open")); setMsg(null); };
  return (
    <div aria-live="polite" className={`fixed bottom-24 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 transition-all duration-300 sm:bottom-24 ${msg ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}>
      {msg ? (
        <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-xl">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink">Added to cart</p>
            <p className="line-clamp-1 text-xs text-gray-500">{msg}</p>
          </div>
          <button onClick={openCart} className="shrink-0 rounded-full bg-ink px-4 py-2 text-[11px] uppercase tracking-widest text-white transition hover:bg-gold">View cart</button>
        </div>
      ) : null}
    </div>
  );
}
