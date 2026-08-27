"use client";
import { useEffect, useState } from "react";
export default function CookieNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => { try { if (!localStorage.getItem("chayamukhi_cookie_ok")) setShow(true); } catch {} }, []);
  if (!show) return null;
  return (
    <div className="fixed bottom-5 left-5 z-30 max-w-xs rounded-lg border border-black/10 bg-white p-4 text-xs shadow-lg">
      <p className="text-gray-600">We use cookies to improve your experience and remember your cart.</p>
      <button className="mt-3 rounded-full bg-ink px-4 py-1.5 text-[11px] uppercase tracking-wide text-white"
        onClick={() => { try { localStorage.setItem("chayamukhi_cookie_ok", "1"); } catch {} setShow(false); }}>Accept</button>
    </div>
  );
}
