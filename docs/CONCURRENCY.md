# Concurrency model

The store has no database. Every durable object is a raw JSON resource on Cloudinary
account **c1**. That is fine for reads, but a naive "read the blob, change it, upload
it again" write **loses data** whenever two writes overlap — and the overlap window is
not microseconds, it is an Admin API call + a CDN fetch + the mutation + an upload,
so roughly **0.5–3 seconds per write**.

Before this change, all eight mutation sites did exactly that. Two orders placed in
the same few seconds silently dropped one, with nothing in any log.

## Orders — collision-proof by construction

Orders are append-only and belong to customers, so they get the strongest guarantee
available without new infrastructure: **one raw object per order**.

```
chayamukhi/orders/ORD-XXXXXXXXXX      ← one object per order  (source of truth)
chayamukhi/data/orders                ← pre-sharding blob, read-only backup
```

Two simultaneous checkouts write two different keys, so they *physically cannot*
overwrite each other. No lock, no retry, no lost order. Bonus properties:

- **Lookup is O(1).** `/track` reads one object by id instead of downloading and
  scanning every order ever placed.
- **No unbounded file.** The old `orders.json` grew forever and was re-uploaded in
  full on every single checkout.
- **Failures are honest.** `/api/order` now returns an error if the write fails,
  so the storefront keeps the cart instead of clearing it on a phantom success.

Order ids are now storage keys, so `newOrderId()` was strengthened from 6 chars of
`Math.random()` to 10 chars of CSPRNG output over a 31-symbol alphabet (no `I/L/O/0/1`),
and `/api/order` verifies the key is free before using it.

### Migrating existing orders

Idempotent, never destructive:

```
POST /api/admin/orders   { "action": "migrate" }
```

It copies each order out of the legacy blob into its own object, skipping any that
already exist, and **never deletes the legacy blob**. Reads fall back to the legacy
blob for anything not yet migrated, so the site behaves correctly before, during and
after migration. `/api/admin/health` reports what is left.

## Manifest — compare-and-set

The catalog is genuinely one document (products nested inside finishes), so it cannot
be sharded as cheaply. Instead, **every** manifest write now funnels through one
function, `mutateManifest()` in `lib/cloudinary.ts`:

1. read the manifest fresh, remembering the Cloudinary asset `version` it came from
2. run the caller's `apply(manifest)` against that snapshot
3. re-read the version — if another writer committed meanwhile, **throw the attempt
   away** and re-run `apply` against the newer manifest (jittered backoff, 5 attempts)
4. otherwise write

Cloudinary stamps a monotonically increasing `version` on every overwrite, which is
what makes step 3 possible without any extra storage.

Two rules make this correct:

- **`apply` must be pure.** It can run several times. Every side effect — resolving
  uploaded images, destroying images, revalidating paths — happens outside it, and
  ids/timestamps are generated *before* the mutation so a retry produces the same
  entity rather than a duplicate.
- **Reject inside, don't write.** Business rejections (duplicate product code,
  missing finish) throw `AbortMutation(status, message)`, which is never retried and
  leaves the manifest untouched. `lib/apiError.ts` maps it, `ManifestConflictError`
  and `CloudNotConfiguredError` to real HTTP statuses instead of a bare 500.

### What this does and does not guarantee

It closes the window from the whole request down to **the single write hop in step 4**,
and it never silently discards a concurrent writer — a loser either retries onto fresh
state or gets a 409.

It is not true mutual exclusion. Cloudinary has no conditional write, so if two writes
land inside that final hop, one can still win. With a single admin that is effectively
unreachable; the exposure is bounded by how many people edit the catalog at once.

**To make it airtight** the store needs one atomic primitive — a `SET NX` on a small
KV (Upstash Redis / Vercel KV, free tier, one env var). `mutateManifest()` is
deliberately the only writer, so adding a lock is a change to one function and
nothing else.
