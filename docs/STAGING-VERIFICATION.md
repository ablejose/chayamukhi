# Staging verification checklist

For validating the concurrency fix (PR #2) on a Vercel preview of the `staging`
branch before promoting it to `main`.

## Before you start

The preview talks to the **same Cloudinary account as production** — there is no
separate test database. That is safe for the migration, which only ever *copies*
orders into new per-order objects and never deletes or modifies the legacy
`chayamukhi/data/orders` blob. Production runs the old code, which reads only that
legacy blob, so **the live site keeps working normally throughout**.

A test order and a test product are real writes to real data, though, and they are
NOT equally safe:

- **A test order is invisible to customers.** The new code writes it to
  `chayamukhi/orders/<id>`, which the old production code never reads. No customer
  impact.
- **A test product IS visible on the live site.** Products live in the shared
  manifest, which production reads with `revalidate = 60` — so anything added from
  the staging admin panel appears on the real storefront within about a minute.
  Either skip the catalog test, or add and delete it immediately and accept ~1
  minute of exposure. Do it outside peak hours.

To remove this overlap entirely, point the preview's `CLOUDINARY_C1/C2/C3` vars at
scratch Cloudinary accounts. That fully isolates staging, at the cost of having no
real data to test the migration against.

## Am I actually on the new code?

The health endpoint is the fastest tell:

| | `catalog` | top-level `orders` |
| --- | --- | --- |
| **old code** | includes an `orders` count | absent |
| **new code** | `finishes` / `products` / `offers` only | `{ shards, legacy, capped, migrated }` |

## Checklist

1. `GET /api/admin/health` (log in at `/admin/login` first). Confirm the **new**
   shape above. With un-migrated orders present this returns `ok: false` plus one
   warning telling you to migrate — **that is the expected signal, not a failure.**
2. Browse the storefront: home, `/shop`, a finish, a product page, `/category`.
   No page or component was changed by the fix, so this should be unremarkable.
3. Migrate, from the DevTools console on the preview domain:
   ```js
   await (await fetch('/api/admin/orders', {
     method: 'POST', headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ action: 'migrate' })
   })).json()
   ```
   Expect `{ ok: true, total: N, migrated: N, skipped: 0, failed: 0 }`.
4. **Run step 3 again.** Expect `migrated: 0, skipped: N`. This proves the
   migration is idempotent and cannot duplicate or corrupt anything — the single
   most important check here.
5. `/track` a **pre-existing** order number + its phone. Proves the legacy
   fallback path works for orders placed before the fix.
6. Place a test order through the cart. WhatsApp should open with the message
   intact and the new `ORD-` code should be **10 characters**, not 6. Then
   `/track` it.
7. In `/admin`: add a throwaway product, toggle stock, edit its code, delete it.
   Then add and delete a test finish. Deleting something twice now returns a
   clean 404 instead of a silent success.
8. `GET /api/admin/orders` — newest-first list including your test order. This
   endpoint is new; before the fix, orders were effectively write-only.
9. `GET /api/admin/health` again — `orders.shards` should have grown by one, and
   `ok` should now be `true`.

## After promoting to `main`

Re-run the step 3 migration once against production. Any orders customers placed
while staging was being verified went to the legacy blob via the old code; this
shards them. Nothing breaks if it is skipped — the new code falls back to the
legacy blob on read and `/api/admin/orders` merges both sources — but re-running
keeps the store in one consistent shape.
