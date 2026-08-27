import "server-only";
import { v2 as cloudinaryV2 } from "cloudinary";
import { emptyManifest, normalizeManifest, type Manifest, type CloudKey, type OrderRecord } from "@/lib/collections";
const cloudinary: any = cloudinaryV2;

interface Creds { cloud_name?: string; api_key?: string; api_secret?: string; }
function credsRaw(which: CloudKey): Creds {
  const P = which.toUpperCase();
  return { cloud_name: process.env[`CLOUDINARY_${P}_CLOUD_NAME`], api_key: process.env[`CLOUDINARY_${P}_API_KEY`], api_secret: process.env[`CLOUDINARY_${P}_API_SECRET`] };
}
function configured(which: CloudKey): boolean { const c = credsRaw(which); return Boolean(c.cloud_name && c.api_key && c.api_secret); }
function credsFor(which: CloudKey): Creds { return configured(which) ? credsRaw(which) : credsRaw("c1"); }
function opts(which: CloudKey, extra?: Record<string, unknown>) { return { ...credsFor(which), secure: true, ...(extra ?? {}) }; }

export function cloudForUrl(url?: string | null): CloudKey {
  if (typeof url === "string") for (const k of ["c2", "c3"] as CloudKey[]) { const n = credsRaw(k).cloud_name; if (n && url.indexOf("/" + n + "/") >= 0) return k; }
  return "c1";
}

const MANIFEST_ID = "chayamukhi/data/manifest";
const ORDERS_ID = "chayamukhi/data/orders";

async function readRawJson<T>(publicId: string, fresh: boolean, fallback: T): Promise<T> {
  try {
    const res = await cloudinary.api.resource(publicId, opts("c1", { resource_type: "raw" }));
    const r = await fetch(res.secure_url as string, fresh ? { cache: "no-store" } : { cache: "force-cache" });
    if (!r.ok) return fallback;
    return (await r.json()) as T;
  } catch { return fallback; }
}
async function writeRawJson(publicId: string, data: unknown): Promise<void> {
  const buffer = Buffer.from(JSON.stringify(data));
  await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(opts("c1", { resource_type: "raw", public_id: publicId, overwrite: true, invalidate: true }),
      (err: any, result: any) => (err ? reject(err) : resolve(result)));
    stream.end(buffer);
  });
}

export async function getManifest(o?: { fresh?: boolean }): Promise<Manifest> {
  const raw = await readRawJson<unknown>(MANIFEST_ID, o?.fresh ?? false, null);
  return raw ? normalizeManifest(raw) : emptyManifest();
}
export async function saveManifest(m: Manifest): Promise<void> { m.updatedAt = Date.now(); await writeRawJson(MANIFEST_ID, m); }

export async function getOrders(o?: { fresh?: boolean }): Promise<OrderRecord[]> {
  const raw = await readRawJson<OrderRecord[]>(ORDERS_ID, o?.fresh ?? true, []); return Array.isArray(raw) ? raw : [];
}
export async function appendOrder(order: OrderRecord): Promise<void> { const o = await getOrders({ fresh: true }); o.push(order); await writeRawJson(ORDERS_ID, o); }
export async function findOrder(id: string, phone: string): Promise<OrderRecord | null> {
  const o = await getOrders({ fresh: true });
  return o.find((x) => x.id.toLowerCase() === id.toLowerCase() && x.customer.phone.replace(/\D/g, "").endsWith(phone.replace(/\D/g, "").slice(-10))) ?? null;
}

export function signUpload(paramsToSign: Record<string, string>, which: CloudKey = "c1") {
  const c = credsFor(which); const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({ ...paramsToSign, timestamp: String(timestamp) }, c.api_secret as string);
  return { signature, timestamp, apiKey: c.api_key as string, cloudName: c.cloud_name as string };
}
export async function getImageResource(publicId: string, which: CloudKey = "c1") {
  try { const r = await cloudinary.api.resource(publicId, opts(which, { resource_type: "image" })); return { url: r.secure_url as string, width: r.width as number, height: r.height as number }; }
  catch { return null; }
}
export async function destroyImage(publicId: string, which: CloudKey = "c1"): Promise<void> {
  await cloudinary.uploader.destroy(publicId, opts(which, { resource_type: "image", invalidate: true }));
}
