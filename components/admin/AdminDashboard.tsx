"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_PRODUCT_IMAGES } from "@/lib/collections";
import type { Manifest, Finish, Product, TypeDef } from "@/lib/collections";
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

async function uploadImage(file: File, kind: "product" | "finish-card" | "type-card", targetId?: string): Promise<{ publicId: string }> {
  const optimized = await toWebp(file);
  const body: Record<string, string> = { kind };
  if (targetId) {
    if (kind === "type-card") body.typeId = targetId;
    else body.finishId = targetId;
  }
  const sig = await jsonFetch("/api/admin/sign-upload", "POST", body);
  const fd = new FormData();
  fd.append("file", optimized);
  fd.append("api_key", sig.apiKey);
  fd.append("timestamp", String(sig.timestamp));
  fd.append("signature", sig.signature);
  fd.append("public_id", sig.publicId);
  if (sig.format) fd.append("format", sig.format);
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
  const [busyId, setBusyId] = useState<string | null>(null);

  const products = m.finishes.flatMap((f) => f.products);
  const countFor = (t: TypeDef) => products.filter((p) => p.typeId === t.slug || p.typeId === t.id).length;

  const add = async () => { if (!name.trim()) return; try { await jsonFetch("/api/admin/product-types", "POST", { name }); setName(""); await reload(); flash("Type added"); } catch (e) { fail(e); } };
  const rename = async (id: string, newName: string) => { try { await jsonFetch("/api/admin/product-types", "PATCH", { id, name: newName }); await reload(); flash("Renamed"); } catch (e) { fail(e); } };
  const del = async (t: TypeDef) => {
    const n = countFor(t);
    if (!confirm(n ? `Delete "${t.name}"? ${n} product(s) use it and will be left without a category.` : `Delete "${t.name}"?`)) return;
    try { await jsonFetch("/api/admin/product-types", "DELETE", { id: t.id }); await reload(); flash("Type removed"); } catch (e) { fail(e); }
  };
  const uploadCard = async (id: string, file: File) => {
    setBusyId(id);
    try {
      const { publicId } = await uploadImage(file, "type-card", id);
      await jsonFetch("/api/admin/product-types", "PATCH", { id, cardImage: { publicId } });
      await reload(); flash("Card image updated");
    } catch (e) { fail(e); } finally { setBusyId(null); }
  };
  const clearCard = async (id: string) => {
    setBusyId(id);
    try { await jsonFetch("/api/admin/product-types", "PATCH", { id, cardImage: null }); await reload(); flash("Card image reset to default"); }
    catch (e) { fail(e); } finally { setBusyId(null); }
  };

  return (
    <section>
      <p className="mb-4 text-xs text-gray-500">
        These cards are what shoppers see on the <span className="font-medium">By Style &amp; Category</span> page. Types without a card image fall back to default artwork.
      </p>
      <div className="mb-4 flex max-w-xl gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New product type" className="flex-1 rounded border border-black/15 px-3 py-2 text-sm" />
        <button onClick={add} className="rounded-full bg-ink px-5 py-2 text-[11px] uppercase tracking-widest text-white">Add</button>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {[...m.productTypes].sort((a, b) => a.order - b.order).map((t) => (
          <li key={t.id} className="rounded-lg border border-black/10 p-4">
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-cream">
                {t.cardImage ? <img src={t.cardImage} alt={t.name} className="h-full w-full object-cover" />
                  : <span className="flex h-full w-full items-center justify-center text-[9px] uppercase tracking-wide text-gray-400">Default</span>}
                {busyId === t.id ? <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-[9px] uppercase tracking-wide">…</span> : null}
              </div>
              <input defaultValue={t.name} onBlur={(e) => { if (e.target.value.trim() && e.target.value !== t.name) rename(t.id, e.target.value); }} className="flex-1 rounded border border-black/15 px-2 py-1.5 text-sm" />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>{countFor(t)} products</span>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer text-gold hover:underline">
                  {t.cardImage ? "Replace image" : "Card image"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadCard(t.id, file); e.target.value = ""; }} />
                </label>
                {t.cardImage ? <button onClick={() => clearCard(t.id)} className="text-gray-500 hover:underline">Reset</button> : null}
                <button onClick={() => del(t)} className="text-red-500 hover:underline">Delete</button>
              </div>
            </div>
          </li>
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

function REMOVED_NOT(list: string[], id: string) { return list.indexOf(id) === -1; }

function ProductEditor({ product, types, reload, flash, fail, onClose }: {
  product: Product; types: TypeDef[]; reload: () => Promise<void> | void;
  flash: (s: string) => void; fail: (e: unknown) => void; onClose: () => void;
}) {
  const [f, setF] = useState({
    name: product.name, typeId: product.typeId, price: String(product.price),
    mrp: product.mrp ? String(product.mrp) : "", code: product.code ?? "",
    description: product.description ?? "", inStock: product.inStock,
  });
  const [removed, setRemoved] = useState<string[]>([]);
  const [added, setAdded] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const previews = useMemo(() => added.map((x) => URL.createObjectURL(x)), [added]);
  useEffect(() => () => { previews.forEach((u) => URL.revokeObjectURL(u)); }, [previews]);

  const kept = product.images.filter((im) => REMOVED_NOT(removed, im.publicId));
  const total = kept.length + added.length;
  const room = MAX_PRODUCT_IMAGES - total;

  const save = async () => {
    if (total === 0) { fail(new Error("A product needs at least one image.")); return; }
    setBusy(true);
    try {
      const addImages: { publicId: string }[] = [];
      for (const file of added) addImages.push(await uploadImage(file, "product", product.finishId));
      await jsonFetch("/api/admin/products", "PATCH", {
        productId: product.id, name: f.name, typeId: f.typeId,
        price: Number(f.price) || 0, mrp: f.mrp ? Number(f.mrp) : undefined,
        code: f.code, description: f.description, inStock: f.inStock,
        addImages, removeImages: removed,
      });
      await reload(); flash("Product updated"); onClose();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const field = "w-full rounded border border-black/15 px-3 py-2 text-sm";
  const lbl = "mb-1 block text-[11px] uppercase tracking-widest text-gray-500";

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm"><span className={lbl}>Name</span>
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={field} />
        </label>
        <label className="block text-sm"><span className={lbl}>Category</span>
          <select value={f.typeId} onChange={(e) => setF({ ...f, typeId: e.target.value })} className={field}>
            {types.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
          </select>
        </label>
        <label className="block text-sm"><span className={lbl}>Price</span>
          <input value={f.price} inputMode="numeric" onChange={(e) => setF({ ...f, price: e.target.value })} className={field} />
        </label>
        <label className="block text-sm"><span className={lbl}>MRP</span>
          <input value={f.mrp} inputMode="numeric" placeholder="Optional" onChange={(e) => setF({ ...f, mrp: e.target.value })} className={field} />
        </label>
        <label className="block text-sm sm:col-span-2"><span className={lbl}>Product code</span>
          <input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} className={field} />
        </label>
      </div>
      <label className="block text-sm"><span className={lbl}>Description</span>
        <textarea value={f.description} rows={3} onChange={(e) => setF({ ...f, description: e.target.value })} className={field} />
      </label>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className={lbl + " mb-0"}>Images</span>
          <span className={total >= MAX_PRODUCT_IMAGES ? "text-[11px] text-gold" : "text-[11px] text-gray-400"}>{total}/{MAX_PRODUCT_IMAGES}</span>
        </div>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {kept.map((im) => (
            <li key={im.publicId} className="relative aspect-square overflow-hidden rounded border border-black/10 bg-cream">
              <img src={im.url} alt="" className="h-full w-full object-cover" />
              <button type="button" aria-label="Remove image" onClick={() => setRemoved([...removed, im.publicId])}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[11px] leading-none text-white">×</button>
            </li>
          ))}
          {added.map((file, i) => (
            <li key={"new-" + i} className="relative aspect-square overflow-hidden rounded border border-gold bg-cream">
              <img src={previews[i]} alt="" className="h-full w-full object-cover" />
              <button type="button" aria-label="Remove image" onClick={() => setAdded(added.filter((_, x) => x !== i))}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[11px] leading-none text-white">×</button>
            </li>
          ))}
        </ul>
        {removed.length ? (
          <button type="button" onClick={() => setRemoved([])} className="mt-2 text-[11px] text-gray-500 underline">Undo {removed.length} removal{removed.length === 1 ? "" : "s"}</button>
        ) : null}
        <label className={room <= 0
          ? "mt-2 block rounded border border-dashed border-black/10 px-3 py-2 text-center text-[11px] uppercase tracking-widest text-gray-300"
          : "mt-2 block cursor-pointer rounded border border-dashed border-black/20 px-3 py-2 text-center text-[11px] uppercase tracking-widest text-gray-500 hover:border-ink hover:text-ink"}>
          {room <= 0 ? "Limit reached" : "Add images"}
          <input type="file" accept="image/*" multiple disabled={room <= 0} className="hidden"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              if (picked.length > room) fail(new Error("Only " + room + " more allowed — " + (picked.length - room) + " skipped."));
              setAdded([...added, ...picked.slice(0, Math.max(0, room))]);
              e.target.value = "";
            }} />
        </label>
        <p className="mt-1 text-[11px] text-gray-400">Removals are permanent once you save.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.inStock} onChange={(e) => setF({ ...f, inStock: e.target.checked })} /> In stock</label>
        <div className="ml-auto flex gap-2">
          <button onClick={onClose} className="rounded-full border border-black/15 px-4 py-2 text-[11px] uppercase tracking-widest">Cancel</button>
          <button onClick={save} disabled={busy} className="rounded-full bg-ink px-5 py-2 text-[11px] uppercase tracking-widest text-white disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function Products({ m, reload, flash, fail }: SectionProps) {
  const [finishId, setFinishId] = useState(m.finishes[0]?.id ?? "");
  const finish: Finish | undefined = m.finishes.find((f) => f.id === finishId);
  const [form, setForm] = useState({ name: "", typeId: m.productTypes[0]?.id ?? "", price: "", mrp: "", code: "", description: "", inStock: true });
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => { previews.forEach((u) => URL.revokeObjectURL(u)); }, [previews]);

  const add = async () => {
    if (!form.name.trim() || !finishId || !form.typeId) { fail(new Error("Name, finish and type are required.")); return; }
    if (!files.length) { fail(new Error("Add at least one image.")); return; }
    if (files.length > MAX_PRODUCT_IMAGES) { fail(new Error(`Choose at most ${MAX_PRODUCT_IMAGES} images — you selected ${files.length}.`)); return; }
    setBusy(true);
    try {
      const images: { publicId: string }[] = [];
      for (const file of files) images.push(await uploadImage(file, "product", finishId));
      await jsonFetch("/api/admin/products", "POST", { finishId, typeId: form.typeId, name: form.name, code: form.code || undefined, price: Number(form.price), mrp: form.mrp ? Number(form.mrp) : undefined, description: form.description, inStock: form.inStock, images });
      setForm({ name: "", typeId: form.typeId, price: "", mrp: "", code: "", description: "", inStock: true });
      setFiles([]);
      await reload(); flash("Product added");
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const del = async (p: Product) => { if (!confirm(`Delete "${p.name}"?`)) return; try { await jsonFetch("/api/admin/products", "DELETE", { finishId, productId: p.id }); await reload(); flash("Product deleted"); } catch (e) { fail(e); } };
  const toggleStock = async (p: Product) => { try { await jsonFetch("/api/admin/products", "PATCH", { productId: p.id, inStock: !p.inStock }); await reload(); } catch (e) { fail(e); } };
  const setCode = async (p: Product, code: string) => { try { await jsonFetch("/api/admin/products", "PATCH", { productId: p.id, code }); await reload(); flash("Code updated"); } catch (e) { fail(e); } };

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
        <label className="mb-3 block text-sm"><span className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">Product code</span>
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Optional — auto CHM-001 if left blank" className="w-full rounded border border-black/15 px-3 py-2 text-sm" />
        </label>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price ₹" inputMode="numeric" className="rounded border border-black/15 px-3 py-2 text-sm" />
          <input value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} placeholder="MRP ₹ (optional)" inputMode="numeric" className="rounded border border-black/15 px-3 py-2 text-sm" />
        </div>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={3} className="mb-3 w-full rounded border border-black/15 px-3 py-2 text-sm" />
        <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.inStock} onChange={(e) => setForm({ ...form, inStock: e.target.checked })} /> In stock</label>
        <div className="mb-1">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-widest text-gray-500">Images</span>
            <span className={`text-[11px] ${files.length >= MAX_PRODUCT_IMAGES ? "text-gold" : "text-gray-400"}`}>{files.length}/{MAX_PRODUCT_IMAGES}</span>
          </div>
          {files.length ? (
            <ul className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="relative aspect-square overflow-hidden rounded border border-black/10 bg-cream">
                  <img src={previews[i]} alt={f.name} className="h-full w-full object-cover" />
                  <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, x) => x !== i))}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[11px] leading-none text-white">×</button>
                </li>
              ))}
            </ul>
          ) : null}
          <label className={`block cursor-pointer rounded border border-dashed px-3 py-2 text-center text-[11px] uppercase tracking-widest ${files.length >= MAX_PRODUCT_IMAGES ? "border-black/10 text-gray-300" : "border-black/20 text-gray-500 hover:border-ink hover:text-ink"}`}>
            {files.length >= MAX_PRODUCT_IMAGES ? "Limit reached" : "Add images"}
            <input type="file" accept="image/*" multiple disabled={files.length >= MAX_PRODUCT_IMAGES} className="hidden"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                const room = MAX_PRODUCT_IMAGES - files.length;
                if (picked.length > room) fail(new Error(`Only ${room} more image${room === 1 ? "" : "s"} allowed — ${picked.length - room} skipped.`));
                setFiles([...files, ...picked.slice(0, room)]);
                e.target.value = "";
              }} />
          </label>
        </div>
        <p className="mb-4 mt-1 text-[11px] leading-relaxed text-gray-400">Up to {MAX_PRODUCT_IMAGES} images. Saved as WebP, max 1600px.</p>
        <button onClick={add} disabled={busy} className="w-full rounded-full bg-ink py-2.5 text-[11px] uppercase tracking-widest text-white disabled:opacity-50">{busy ? "Uploading…" : "Add Product"}</button>
      </div>

      <div>
        <h2 className="mb-4 text-[11px] uppercase tracking-widest text-gray-500">{finish?.name} · {finish?.products.length ?? 0} products</h2>
        <ul className="space-y-3">
          {finish?.products.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-black/10 p-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-cream">{p.images[0]?.url ? <img src={p.images[0].url} alt={p.name} className="h-full w-full object-cover" /> : null}</div>
              <div className="min-w-0 flex-1 basis-[calc(100%-4.75rem)]">
                <p className="line-clamp-1 text-sm">{p.name}</p>
                <p className="text-xs text-gray-500">{formatINR(p.price)} · {m.productTypes.find((t) => t.id === p.typeId || t.slug === p.typeId)?.name ?? "—"}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-widest text-gray-400">Code</span>
                  <input defaultValue={p.code ?? ""} onBlur={(e) => { const v = e.target.value.trim(); if (v !== (p.code ?? "")) setCode(p, v); }} placeholder="—" className="w-28 rounded border border-black/15 px-2 py-0.5 text-xs" />
                </div>
              </div>
              <button onClick={() => toggleStock(p)} className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-widest ${p.inStock ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{p.inStock ? "In stock" : "Sold out"}</button>
              <button onClick={() => setEditingId(editingId === p.id ? null : p.id)} className="text-xs text-gold hover:underline">{editingId === p.id ? "Close" : "Edit"}</button>
              <button onClick={() => del(p)} className="text-xs text-red-500 hover:underline">Delete</button>
              {editingId === p.id ? (
                <div className="w-full basis-full border-t border-black/10 pt-3">
                  <ProductEditor product={p} types={m.productTypes} reload={reload} flash={flash} fail={fail} onClose={() => setEditingId(null)} />
                </div>
              ) : null}
            </li>
          ))}
          {finish && finish.products.length === 0 ? <li className="rounded-lg border border-dashed border-black/15 px-4 py-10 text-center text-sm text-gray-400">No products in this finish yet.</li> : null}
        </ul>
      </div>
    </section>
  );
}
