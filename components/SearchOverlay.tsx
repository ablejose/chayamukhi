"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconClose, IconSearch } from "./icons";

export default function SearchOverlay({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    onClose();
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
  };
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-0 right-0 top-0 bg-white p-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <IconSearch />
          <form onSubmit={submit} className="flex-1">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jewellery…" className="w-full border-b border-black/20 bg-transparent py-2 text-lg outline-none placeholder:text-gray-400" />
          </form>
          <button aria-label="Close search" onClick={onClose}><IconClose /></button>
        </div>
      </div>
    </div>
  );
}
