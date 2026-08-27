"use client";
import { usePathname, useRouter } from "next/navigation";

export default function BackBar() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/") return null;
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  };
  return (
    <div className="mx-auto max-w-7xl px-4 pt-4">
      <button onClick={goBack} className="inline-flex items-center gap-1.5 text-sm text-ink transition hover:text-gold">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        Back
      </button>
    </div>
  );
}
