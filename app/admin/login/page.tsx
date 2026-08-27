"use client";
import React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BRAND } from "@/config/brand";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed.");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
      <div className="text-center">
        <div className="font-serif text-2xl tracking-[0.25em]">{BRAND.name}</div>
        <p className="mt-2 text-[11px] uppercase tracking-widest text-gray-500">Admin</p>
      </div>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded border border-black/15 px-3 py-2.5 text-sm" />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button type="submit" disabled={busy} className="w-full rounded-full bg-ink py-3 text-[11px] uppercase tracking-widest text-white disabled:opacity-50">{busy ? "Signing in…" : "Sign In"}</button>
      </form>
    </main>
  );
}
