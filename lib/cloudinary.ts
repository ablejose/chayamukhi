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
/** Pre-sharding single orders blob. Read-only now; kept forever as a backup and for un-migrated lookups. */
const LEGACY_ORDERS_ID = "chayamukhi/data/orders";
/**
 * One raw object per order. Deliberately NOT under `chayamukhi/data/` so a prefix
 * listing can never pick up LEGACY_ORDERS_ID (`chayamukhi/data/orders`) as a sibling.
 */
const ORDER_PREFIX = "chayamukhi/orders/";

/* ───────────────────────────── raw JSON primitives ─────────────────────────────
 * Every durable object is a raw JSON resource on c1. Cloudinary stamps each
 * resource with a monotonically increasing `version` on every overwrite; we use
 * that as the compare-and-set token for the manifest (see mutateManifest).
 * --------------------------------------------------------------------------- */

interface RawRead<T> { data: T; version: number | null }

async function readRaw<T>(publicId: string, fresh: boolean, fallback: T): Promise<RawRead<T>> {
  try {
    const res = await cloudinary.api.resource(publicId, opts("c1", { resource_type: "raw" }));
    const version = typeof res?.version === "number" ? res.version : null;
    const r = await fetch(res.secure_url as string, fresh ? { cache: "no-store" } : { cache: "force-cache" });
    if (!r.ok) return { data: fallback, version };
    return { data: (await r.json()) as T, version };
  } catch { return { data: fallback, version: null }; }
}

async function readRawJson<T>(publicId: string, fresh: boolean, fallback: T): Promise<T> {
  return (await readRaw<T>(publicId, fresh, fallback)).data;
}

async function writeRawJson(publicId: string, data: unknown): Promise<void> {
  const buffer = Buffer.from(JSON.stringify(data));
  await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(opts("c1", { resource_type: "raw", public_id: publicId, overwrite: true, invalidate: true }),
      (err: any, result: any) => (err ? reject(err) : resolve(result)));
    stream.end(buffer);
  });
}

/** Current Cloudinary asset version of a raw object, or null if it does not exist yet. */
async function rawVersion(publicId: string): Promise<number | null> {
  try {
    const res = await cloudinary.api.resource(publicId, opts("c1", { resource_type: "raw" }));
    return typeof res?.version === "number" ? res.version : null;
  } catch { return null; }
}

async function rawExists(publicId: string): Promise<boolean> {
  try { await cloudinary.api.resource(publicId, opts("c1", { resource_type: "raw" })); return true; }
  catch { return false; }
}

interface RawEntry { publicId: string; url: string }
/** List raw objects under a prefix, following Cloudinary's cursor pagination. */
async function listRaw(prefix: string, cap: number): Promise<RawEntry[]> {
  const out: RawEntry[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await cloudinary.api.resources(opts("c1", { resource_type: "raw", type: "upload", prefix, max_results: 100, next_cursor: cursor }));
    for (const r of res?.resources ?? []) out.push({ publicId: r.public_id as string, url: r.secure_url as string });
    cursor = res?.next_cursor;
  } while (cursor && out.length < cap);
  return out;
}

/* ───────────────────────────────── manifest ───────────────────────────────── */

export async function getManifest(o?: { fresh?: boolean }): Promise<Manifest> {
  const raw = await readRawJson<unknown>(MANIFEST_ID, o?.fresh ?? false, null);
  return raw ? normalizeManifest(raw) : emptyManifest();
}

/**
 * Low-level manifest write. Prefer mutateManifest() — a bare save has no
 * concurrency protection and will clobber a writer that committed since you read.
 */
export async function saveManifest(m: Manifest): Promise<void> { m.updatedAt = Date.now(); await writeRawJson(MANIFEST_ID, m); }

/**
 * Thrown from inside a mutateManifest() callback to reject the change on business
 * grounds (duplicate code, missing finish, …). It is NOT retried: the manifest is
 * left untouched and `status` is surfaced to the client.
 */
export class AbortMutation extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "AbortMutation";
    this.status = status;
  }
}

/** Thrown when a concurrent writer kept winning the race for every attempt. */
export class ManifestConflictError extends Error {
  status = 409;
  attempts: number;
  constructor(attempts: number) {
    super("Another change was saved at the same moment, so this one was not applied. Nothing was lost — reload the admin panel and try again.");
    this.name = "ManifestConflictError";
    this.attempts = attempts;
  }
}

const MUTATE_ATTEMPTS = 5;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * THE ONLY SAFE WAY TO WRITE THE MANIFEST.
 *
 * Cloudinary offers no conditional write, so this implements compare-and-set on
 * top of the asset `version` it stamps on every overwrite:
 *
 *   1. read the manifest fresh, remembering the version it came from
 *   2. run `apply` against that snapshot
 *   3. re-read the version — if another writer committed meanwhile, throw the
 *      attempt away and re-run `apply` against the newer manifest
 *   4. otherwise write
 *
 * This is what stops one admin's change from silently erasing another's. It
 * shrinks the lost-update window from the whole request (a read + a CDN fetch +
 * your mutation + an upload, i.e. seconds) to the single write hop in step 4.
 *
 * `apply` MUST be pure — it can be re-run several times. Do every side effect
 * (image resolution, image deletion, revalidation) outside, before or after.
 */
export async function mutateManifest<T>(apply: (m: Manifest) => T | Promise<T>): Promise<{ manifest: Manifest; result: T }> {
  for (let attempt = 1; attempt <= MUTATE_ATTEMPTS; attempt++) {
    const snap = await readRaw<unknown>(MANIFEST_ID, true, null);
    const m = snap.data ? normalizeManifest(snap.data) : emptyManifest();

    // AbortMutation propagates untouched — a rejected change must not be retried.
    const result = await apply(m);

    if ((await rawVersion(MANIFEST_ID)) !== snap.version) {
      await sleep(60 * attempt + Math.floor(Math.random() * 60)); // jittered backoff
      continue;
    }

    await saveManifest(m);
    return { manifest: m, result };
  }
  throw new ManifestConflictError(MUTATE_ATTEMPTS);
}

/* ────────────────────────────────── orders ──────────────────────────────────
 * Orders are append-only and customer-facing, so they get the strongest
 * guarantee available: each order is its OWN raw object. Two checkouts write
 * two different keys, so they physically cannot overwrite each other — no
 * locking, no retries, no lost orders. Lookup by id is a single direct read
 * instead of pulling and scanning every order ever placed.
 * -------------------------------------------------------------------------- */

const ORDER_ID_RE = /^ORD-[A-Z0-9]{4,24}$/;
const orderPublicId = (id: string) => `${ORDER_PREFIX}${id}`;
const normalizeOrderId = (raw: unknown) => String(raw ?? "").trim().toUpperCase();
const last10 = (p: unknown) => String(p ?? "").replace(/\D/g, "").slice(-10);

/** Persist one order. Safe under any amount of concurrency. */
export async function putOrder(order: OrderRecord): Promise<void> {
  const id = normalizeOrderId(order.id);
  if (!ORDER_ID_RE.test(id)) throw new Error(`Refusing to store an order with a malformed id: "${order.id}"`);
  await writeRawJson(orderPublicId(id), { ...order, id });
}

/**
 * True if an order number is already taken. The id is now a storage key, so the
 * checkout route checks before using one rather than risking an overwrite.
 */
export async function orderIdTaken(id: string): Promise<boolean> {
  const clean = normalizeOrderId(id);
  if (!ORDER_ID_RE.test(clean)) return true;
  return await rawExists(orderPublicId(clean));
}

export async function getOrderById(id: string): Promise<OrderRecord | null> {
  const clean = normalizeOrderId(id);
  if (!ORDER_ID_RE.test(clean)) return null;
  return await readRawJson<OrderRecord | null>(orderPublicId(clean), true, null);
}

/** Orders still living in the pre-sharding single blob. */
async function legacyOrders(): Promise<OrderRecord[]> {
  const raw = await readRawJson<OrderRecord[]>(LEGACY_ORDERS_ID, true, []);
  return Array.isArray(raw) ? raw : [];
}

/** Customer-facing lookup: order number + the last 10 digits of the phone that placed it. */
export async function findOrder(id: string, phone: string): Promise<OrderRecord | null> {
  const digits = last10(phone);
  if (digits.length < 10) return null;

  const direct = await getOrderById(id);
  if (direct) return last10(direct.customer?.phone) === digits ? direct : null;

  const clean = normalizeOrderId(id);
  return (await legacyOrders()).find((x) => normalizeOrderId(x.id) === clean && last10(x.customer?.phone) === digits) ?? null;
}

/** Newest-first order list for the admin panel. Merges shards with any un-migrated legacy orders. */
export async function listOrders(o?: { limit?: number }): Promise<OrderRecord[]> {
  const cap = Math.max(1, Math.min(o?.limit ?? 200, 1000));
  const entries = await listRaw(ORDER_PREFIX, cap);

  const byId = new Map<string, OrderRecord>();
  const CHUNK = 20; // keep Cloudinary/CDN fan-out polite
  for (let i = 0; i < entries.length; i += CHUNK) {
    const batch = await Promise.all(entries.slice(i, i + CHUNK).map(async (e) => {
      try { const r = await fetch(e.url, { cache: "no-store" }); return r.ok ? ((await r.json()) as OrderRecord) : null; }
      catch { return null; }
    }));
    for (const rec of batch) if (rec?.id) byId.set(normalizeOrderId(rec.id), rec);
  }
  for (const rec of await legacyOrders()) {
    const k = normalizeOrderId(rec?.id);
    if (k && !byId.has(k)) byId.set(k, rec);
  }

  return [...byId.values()].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, cap);
}

/**
 * Cheap counts for the health check — lists keys without fetching any bodies.
 *
 * Deliberately CAPPED. Prefix listing costs one Cloudinary Admin API call per 100
 * keys and that API is rate-limited (500/hour on smaller plans), so an exact count
 * would eventually spend the entire hourly budget on a single health check. When
 * `capped` is true, `shards` means "at least this many".
 */
const STATS_KEY_CAP = 500;
export async function orderStats(): Promise<{ shards: number; legacy: number; capped: boolean; migrated: boolean }> {
  const keys = await listRaw(ORDER_PREFIX, STATS_KEY_CAP);
  const legacy = (await legacyOrders()).length;
  const capped = keys.length >= STATS_KEY_CAP;
  return { shards: keys.length, legacy, capped, migrated: legacy === 0 || capped || keys.length >= legacy };
}

/**
 * One-time, idempotent: explode the legacy orders blob into one object per order.
 * Never deletes the legacy blob — it stays as a backup. Safe to re-run.
 */
export async function migrateLegacyOrders(): Promise<{ total: number; migrated: number; skipped: number; failed: number; failures: string[] }> {
  const legacy = await legacyOrders();

  // Existing shards are listed ONCE up front rather than probed per order. A
  // per-order rawExists() would cost one rate-limited Admin API call each, which
  // for a few hundred orders would exhaust the hourly budget mid-migration.
  const existing = new Set((await listRaw(ORDER_PREFIX, 100_000)).map((e) => e.publicId));

  let migrated = 0, skipped = 0, failed = 0;
  const failures: string[] = [];

  for (const rec of legacy) {
    const id = normalizeOrderId(rec?.id);
    if (!ORDER_ID_RE.test(id)) { failed++; failures.push(`malformed id: ${JSON.stringify(rec?.id ?? null)}`); continue; }
    try {
      if (existing.has(orderPublicId(id))) { skipped++; continue; }
      await putOrder({ ...rec, id });
      migrated++;
    } catch (e) { failed++; failures.push(`${id}: ${(e as Error)?.message ?? "write failed"}`); }
  }

  return { total: legacy.length, migrated, skipped, failed, failures };
}

/* ─────────────────────────────────── images ─────────────────────────────────── */

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
