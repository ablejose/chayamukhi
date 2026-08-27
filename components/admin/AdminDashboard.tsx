"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Manifest, Finish, Product } from "@/lib/collections";
import { formatINR } from "@/lib/format";

type Tab = "products" | "finishes" | "types" | "announcement";

async function jsonFetch(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${method} ${url} failed`);
  return data;
}

// Uploaded images are optimised client-side before leaving the browser: resized to at
// most MAX_DIM on the long edge and re-encoded to WebP, targeting <= ~1MB. Images the
// browser cannot decode/encode (e.g. some HEIC) fall back to the original within a hard cap.
const MAX_DIM = 1600;
const TARGET_BYTES = 1_000_000;
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

async function toWebp(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name}: please choose an image file.`);
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as unknown as ImageBitmapOptions);
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no-2d-context");
    ctx.drawImage(bitmap, 0, 0, w, h);
    if (typeof bitmap.close === "function") bitmap.close();
    let quality = 0.82;
    let blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", quality));
    if (!blob || blob.type !== "image/webp") throw new Error("webp-unsupported");
    while (blob.size > TARGET_BYTES && quality > 0.5) {
      quality = Math.round((quality - 0.1) * 100) / 100;
      const next = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", quality));
      if (!next) break;
      blob = next;
    }
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.webp`, { type: "image/webp" });
  } catch {
    if (file.size > MAX_INPUT_BYTES) throw new Error(`${file.name}: could not convert to WebP and it is over 25MB. Please upload a JPG, PNG or WebP under 25MB.`);
    return file;
  }
}

async function uploadImage(file: File, kind: "product" | "finish-card", finishId?: string): Promise<{ publicId: string }> {
  const optimized = await toWebp(file);
  const sig = await jsonFetch("/api/admin/sign-upload", "POST", { kind, finishId });
  const fd = new FormData();
  fd.append("file", optimized);
  fd.append("api_key", sig.apiKey);
  fd.append("timestamp", String(sig.timestamp));
  fd.append("signature", sig.signature);
  fd.append("public_id", sig.publicId);
  const up = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body: fd });
  const data = await up.json();
  if (!up.ok) throw new Error(data.error?.message || "Cloudinary upload failed");
  return { publicId: sig.publicId };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [m, setM] = useState<Manifest | null>(null);
  const [tab, setTab] = useState<Tab>("products");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try { const data = await jsonFetch("/api/admin/manifest", "GET"); setM(data as Manifest); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to load"); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (s: string) => { setMsg(s); setErr(""); setTimeout(() => setMsg(""), 2500); };
  const fail = (e: unknown) => setErr(e instanceof Error ? e.message : "Something went wrong");

  const logout = async () => { await fetch("/api/admin/logout", { method: "POST" }); router.push("/admin/login"); router.refresh(); };

  if (!m) return <main className="mx-auto max-w-6xl px-4 py-16 text-sm text-gray-500">{err || "Loading…"}</main>;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-8 pt-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl tracking-[0.15em]">CHAYAMUKHI · Admin</h1>
        <button onClick={logout} className="rounded-full border border-black/15 px-4 py-2 text-[11px] uppercase tracking-widest hover:bg-ink hover:text-white">Log out</button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["products", "finishes", "types", "announcement"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-2 text-[11px] uppercase tracking-widest ${tab === t ? "bg-ink text-white" : "border border-black/15"}`}>
            {t === "types" ? "Product Types" : t}
          </button>
        ))}
      </div>

      {msg ? <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</p> : null}
      {err ? <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p> : null}

      {tab === "products" ? <Products m={m} reload={load} flash={flash} fail={fail} /> : null}
      {tab === "finishes" ? <Finishes m={m} reload={load} flash={flash} fail={fail} /> : null}
      {tab === "types" ? <Types m={m} reload={load} flash={flash} fail={fail} /> : null}
      {tab === "announcement" ? <Announcement m={m} reload={load} flash={flash} fail={fail} /> : null}
    </main>
  );
}

type SectionProps = { m: Manifest; reload: () => Promise<void>; flash: (s: string) => void; fail: (e: unknown) => void };

function Announcement({ m, reload, flash, fail }: SectionProps) {
  const [text, setText] = useState(m.announcement.text);
  const [active, setActive] = useState(m.announcement.active);
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); try { await jsonFetch("/api/admin/announcement", "POST", { text, active }); await reload(); flash("Announcement saved"); } catch (e) { fail(e); } finally { setBusy(false); } };
  return (
    <section className="max-w-xl rounded-lg border border-black/10 p-5">
      <h2 className="mb-4 text-[11px] uppercase tracking-widest text-gray-500">Announcement Bar</h2>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Free shipping over ₹999…" className="w-full rounded border border-black/15 px-3 py-2 text-sm" />
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Show the bar</label>
      <button onClick={save} disabled={busy} className="mt-4 rounded-full bg-ink px-5 py-2 text-[11px] uppercase tracking-widest text-white disabled:opacity-50">Save</button>
    </section>
  );
}

function Types({ m, reload, flash, fail }: SectionProps) {
  const [name, setName] = useState("");
  const add = async () => { if (!name.trim()) return; try { await jsonFetch("/api/admin/product-types", "POST", { name }); setName(""); await reload(); flash("Type added"); } catch (e) { fail(e); } };
  const del = async (id: string) => { try { await jsonFetch("/api/admin/product-types", "DELETE", { id }); await reload(); flash("Type removed"); } catch (e) { fail(e); } };
  return (
    <section className="max-w-xl">
      <div className="mb-4 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New product type" className="flex-1 rounded border border-black/15 px-3 py-2 text-sm" />
        <button onClick={add} className="rounded-full bg-ink px-5 py-2 text-[11px] uppercase tracking-widest text-white">Add</button>
      </div>
      <ul className="divide-y divide-black/10 rounded-lg border border-black/10">
        {m.productTypes.map((t) => (
          <li key={t.id} className="flex items-center justify-between px-4 py-3 text-sm">{t.name}<button onClick={() => del(t.id)} className="text-xs text-red-500 hover:underline">Delete</button></li>
        ))}
      </ul>
    </section>
  );
}

function Finishes({ m, reload, flash, fail }: SectionProps) {
  const [name, setName] = useState("");
  const add = async () => { if (!name.trim()) return; try { await jsonFetch("/api/admin/finishes", "POST", { name }); setName(""); await reload(); flash("Finish added"); } catch (e) { fail(e); } };
  const rename = async (id: string, newName: string) => { try { await jsonFetch("/api/admin/finishes", "PATCH", { id, name: newName }); await reload(); flash("Renamed"); } catch (e) { fail(e); } };
  const del = async (id: string) => { if (!confirm("Delete this finish and ALL its products?")) return; try { await jsonFetch("/api/admin/finishes", "DELETE", { id }); await reload(); flash("Finish deleted"); } catch (e) { fail(e); } };
  const uploadCard = async (id: string, file: File) => { try { const { publicId } = await uploadImage(file, "finish-card", id); await jsonFetch("/api/admin/finishes", "PATCH", { id, cardImage: { publicId } }); await reload(); flash("Card image updated"); } catch (e) { fail(e); } };
  return (
    <section>
      <div className="mb-4 flex max-w-xl gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New finish name" className="flex-1 rounded border border-black/15 px-3 py-2 text-sm" />
        <button onClick={add} className="rounded-full bg-ink px-5 py-2 text-[11px] uppercase tracking-widest text-white">Add</button>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {[...m.finishes].sort((a, b) => a.order - b.order).map((f) => (
          <li key={f.id} className="rounded-lg border border-black/10 p-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-cream">{f.cardImage ? <img src={f.cardImage} alt={f.name} className="h-full w-full object-cover" /> : null}</div>
              <input defaultValue={f.name} onBlur={(e) => { if (e.target.value !== f.name) rename(f.id, e.target.value); }} className="flex-1 rounded border border-black/15 px-2 py-1.5 text-sm" />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>{f.products.length} products</span>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer text-gold hover:underline">Card image<input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadCard(f.id, file); }} /></label>
                <button onClick={() => del(f.id)} className="text-red-500 hover:underline">Delete</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Products({ m, reload, flash, fail }: SectionProps) {
  const [finishId, setFinishId] = useState(m.finishes[0]?.id ?? "");
  const finish: Finish | undefined = m.finishes.find((f) => f.id === finishId);
  const [form, setForm] = useState({ name: "", typeId: m.productTypes[0]?.id ?? "", price: "", mrp: "", description: "", inStock: true });
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!form.name.trim() || !finishId || !form.typeId) { fail(new Error("Name, finish and type are required.")); return; }
    if (!files || !files.length) { fail(new Error("Add at least one image.")); return; }
    setBusy(true);
    try {
      const images: { publicId: string }[] = [];
      for (const file of Array.from(files)) images.push(await uploadImage(file, "product", finishId));
      await jsonFetch("/api/admin/products", "POST", { finishId, typeId: form.typeId, name: form.name, price: Number(form.price), mrp: form.mrp ? Number(form.mrp) : undefined, description: form.description, inStock: form.inStock, images });
      setForm({ name: "", typeId: form.typeId, price: "", mrp: "", description: "", inStock: true });
      setFiles(null);
      (document.getElementById("prod-files") as HTMLInputElement | null)?.value && ((document.getElementById("prod-files") as HTMLInputElement).value = "");
      await reload(); flash("Product added");
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const del = async (p: Product) => { if (!confirm(`Delete "${p.name}"?`)) return; try { await jsonFetch("/api/admin/products", "DELETE", { finishId, productId: p.id }); await reload(); flash("Product deleted"); } catch (e) { fail(e); } };
  const toggleStock = async (p: Product) => { try { await jsonFetch("/api/admin/products", "PATCH", { productId: p.id, inStock: !p.inStock }); await reload(); } catch (e) { fail(e); } };

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <div className="rounded-lg border border-black/10 p-5">
        <h2 className="mb-4 text-[11px] uppercase tracking-widest text-gray-500">Add Product</h2>
        <label className="mb-3 block text-sm"><span className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">Finish</span>
          <select value={finishId} onChange={(e) => setFinishId(e.target.value)} className="w-full rounded border border-black/15 px-3 py-2 text-sm">
            {m.finishes.map((f) => (<option key={f.id} value={f.id}>{f.name}</option>))}
          </select>
        </label>
        <label className="mb-3 block text-sm"><span className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">Type</span>
          <select value={form.typeId} onChange={(e) => setForm({ ...form, typeId: e.target.value })} className="w-full rounded border border-black/15 px-3 py-2 text-sm">
            {m.productTypes.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
          </select>
        </label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" className="mb-3 w-full rounded border border-black/15 px-3 py-2 text-sm" />
        <div className="mb-3 grid grid-cols-2 gap-3">
          <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price ₹" inputMode="numeric" className="rounded border border-black/15 px-3 py-2 text-sm" />
          <input value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} placeholder="MRP ₹ (optional)" inputMode="numeric" className="rounded border border-black/15 px-3 py-2 text-sm" />
        </div>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={3} className="mb-3 w-full rounded border border-black/15 px-3 py-2 text-sm" />
        <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.inStock} onChange={(e) => setForm({ ...form, inStock: e.target.checked })} /> In stock</label>
        <input id="prod-files" type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} className="mb-1 block w-full text-sm" />
        <p className="mb-4 text-[11px] text-gray-400">Images are auto-optimised to WebP and resized (max 1600px, ~1MB) before upload.</p>
        <button onClick={add} disabled={busy} className="w-full rounded-full bg-ink py-2.5 text-[11px] uppercase tracking-widest text-white disabled:opacity-50">{busy ? "Uploading…" : "Add Product"}</button>
      </div>

      <div>
        <h2 className="mb-4 text-[11px] uppercase tracking-widest text-gray-500">{finish?.name} · {finish?.products.length ?? 0} products</h2>
        <ul className="space-y-3">
          {finish?.products.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-lg border border-black/10 p-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-cream">{p.images[0]?.url ? <img src={p.images[0].url} alt={p.name} className="h-full w-full object-cover" /> : null}</div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm">{p.name}</p>
                <p className="text-xs text-gray-500">{formatINR(p.price)} · {m.productTypes.find((t) => t.id === p.typeId || t.slug === p.typeId)?.name ?? "—"}</p>
              </div>
              <button onClick={() => toggleStock(p)} className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-widest ${p.inStock ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{p.inStock ? "In stock" : "Sold out"}</button>
              <button onClick={() => del(p)} className="text-xs text-red-500 hover:underline">Delete</button>
            </li>
          ))}
          {finish && finish.products.length === 0 ? <li className="rounded-lg border border-dashed border-black/15 px-4 py-10 text-center text-sm text-gray-400">No products in this finish yet.</li> : null}
        </ul>
      </div>
    </section>
  );
}
