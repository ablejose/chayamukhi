import "server-only";
import { v2 as cloudinaryV2 } from "cloudinary";
import { emptyManifest, normalizeManifest, cloudForId, CLOUD_KEYS, type Manifest, type CloudKey, type OrderRecord } from "@/lib/collections";
const cloudinary: any = cloudinaryV2;

interface Creds { cloud_name?: string; api_key?: string; api_secret?: string; }
function credsRaw(which: CloudKey): Creds {
  const P = which.toUpperCase();
  return { cloud_name: process.env[`CLOUDINARY_${P}_CLOUD_NAME`], api_key: process.env[`CLOUDINARY_${P}_API_KEY`], api_secret: process.env[`CLOUDINARY_${P}_API_SECRET`] };
}

/** True only when all three secrets for an account are present. */
export function isCloudConfigured(which: CloudKey): boolean {
  const c = credsRaw(which);
  return Boolean(c.cloud_name && c.api_key && c.api_secret);
}

/** The accounts that are fully configured, in canonical order (c1 first — it also stores the manifest + orders). */
export function activeClouds(): CloudKey[] {
  return CLOUD_KEYS.filter(isCloudConfigured);
}

/**
 * Choose the image account for a given id, spreading ONLY across configured accounts.
 * There is NO silent fallback: an id is never handed to an account whose credentials are missing,
 * so uploads can never quietly pile onto c1 because c2/c3 were left unset — that misconfiguration
 * surfaces (via the /api/admin/health check) instead of hiding.
 */
export function pickCloud(id: string): CloudKey {
  const active = activeClouds();
  if (!active.length) {
    throw new Error("No Cloudinary account is configured. Set CLOUDINARY_C1_CLOUD_NAME, _API_KEY and _API_SECRET (and optionally C2/C3).");
  }
  return cloudForId(id, active);
}

/** Thrown instead of silently substituting a different account's credentials. */
export class CloudNotConfiguredError extends Error {
  status = 503;
  which: CloudKey;
  constructor(which: CloudKey) {
    super(`Cloudinary account "${which}" is not configured. Set CLOUDINARY_${which.toUpperCase()}_CLOUD_NAME, CLOUDINARY_${which.toUpperCase()}_API_KEY and CLOUDINARY_${which.toUpperCase()}_API_SECRET.`);
    this.name = "CloudNotConfiguredError";
    this.which = which;
  }
}

/** Strict credentials — throws a clear error rather than falling back to another account. */
function creds(which: CloudKey): Creds {
  if (!isCloudConfigured(which)) throw new CloudNotConfiguredError(which);
  return credsRaw(which);
}
function opts(which: CloudKey, extra?: Record<string, unknown>) { return { ...creds(which), secure: true, ...(extra ?? {}) }; }

/** Resolve which account an existing image URL physically lives on, by matching the cloud-name path segment. */
export function cloudForUrl(url?: string | null): CloudKey {
  if (typeof url === "string") {
    for (const k of CLOUD_KEYS) {
      const n = credsRaw(k).cloud_name;
      if (n && url.includes(`/${n}/`)) return k;
    }
  }
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
  const c = creds(which); const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({ ...paramsToSign, timestamp: String(timestamp) }, c.api_secret as string);
  return { signature, timestamp, apiKey: c.api_key as string, cloudName: c.cloud_name as string };
}
export async function getImageResource(publicId: string, which: CloudKey = "c1") {
  const o = opts(which, { resource_type: "image" }); // throws CloudNotConfiguredError if the account is missing — surfaces to the caller instead of returning null
  try { const r = await cloudinary.api.resource(publicId, o); return { url: r.secure_url as string, width: r.width as number, height: r.height as number }; }
  catch (e) { if (e instanceof CloudNotConfiguredError) throw e; return null; }
}
export async function destroyImage(publicId: string, which: CloudKey = "c1"): Promise<void> {
  await cloudinary.uploader.destroy(publicId, opts(which, { resource_type: "image", invalidate: true }));
}
