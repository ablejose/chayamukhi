# Performance: why the store feels slow, and what was done

Branch `perf/speed`, 5 Nov 2026. The complaint was that the first load, moving from page to page, and switching images in the product gallery all feel slow.

Line numbers in **Evidence** refer to the code *before* this branch (commit `4d55f7d`) unless marked otherwise.

## Ranked causes

| # | Cause | Who feels it | Fix | Effort | Status |
|---|-------|--------------|-----|--------|--------|
| 1 | Every page render reads the catalog from Cloudinary's rate-limited Admin API, with no caching | Every tap that opens a product or the shop | Cache the reads with a tag, and clear the tag on admin save | S | **Fixed** `b295d9c` |
| 2 | The gallery swaps one `<img>` src, so each arrow tap starts a new download | Every image switch on a product page | Stack the images and preload the neighbours | S | **Fixed** `3e787bb` |
| 3 | Image delivery: full-size originals in the cart, demo art with fake srcsets, too many widths | Every page load while the cart has items; first views of any image | Use the loader everywhere, trim the widths, give the LCP image priority | S | **Fixed** `2ece4d4` |
| 4 | `/product` and `/shop` are dynamic, and a full-screen splash covers every navigation to them | Every tap to a product or the shop | Move product pages to static `/product/[slug]` (ISR) and filter the shop on the client | M | Open |
| 5 | A failed catalog read is shown, and ISR-cached, as an empty store | Rare, but severe when it happens | Throw so ISR keeps serving the last good page | S | Partly fixed |
| 6 | `/shop` sends the whole catalog and renders every card | Grows with the catalog | Slim the props, then paginate or virtualise | M | Open |
| 7 | The first cards on `/category` and `/finish` were lazy-loaded | First load of those pages on a phone | `priority` on the first row | XS | **Fixed** (in `2ece4d4`) |

### 1. Uncached catalog reads through the Cloudinary Admin API (biggest)

**Evidence**
- `lib/cloudinary.ts:85`: `readRaw()` calls `cloudinary.api.resource()` on every read. This is the Cloudinary *Admin* API, and it is rate-limited (500 calls an hour on small plans; the file says so at `:236`). It is an SDK HTTP call, not a `fetch()`, so Next never cached or de-duplicated it. Only the follow-up `fetch` of the versioned JSON (`:87`) was cached.
- `getManifest()` (`:134`) is called by the root layout (`app/layout.tsx:90`), by every page (`app/page.tsx:32`, `app/shop/page.tsx:14`, `app/product/page.tsx:12`, …) and by `generateMetadata` (`app/product/page.tsx:74`). Nothing shared the result inside one request.
- `/product` and `/shop` are dynamic routes (see #4), so they run all of this on every view. Measured against a local mock Cloudinary: **3 Admin API calls per product view and 2 per shop view.**
- Live site, timed from here: pages served from the CDN (`X-Vercel-Cache: HIT`) start arriving in **0.43–0.50 s**. `/shop` (always `MISS`) takes **0.85–1.9 s** and `/product` takes **0.74–1.8 s**. That is roughly **0.4–1.4 s of server time on every tap**, most of it spent on these round trips.
- Rate-limit risk: at 3 calls per product view, about 170 product views an hour exhaust a 500-an-hour budget. After that, `readRaw` swallows the error (`:90`) and the store renders as empty (see #5).

**User-visible effect:** every tap on a product or a shop filter waits on one or more trips to Cloudinary's API before any HTML is sent. Under load, the store can briefly look empty.

**Fix (done, `b295d9c`, `lib/cloudinary.ts` only):**
- Storefront reads go through `unstable_cache` with the tag `manifest` and a 300 s revalidate as a safety net. That cache is Next's Data Cache, which every server instance on Vercel shares.
- React `cache()` wraps it, so the layout, the page and `generateMetadata` make one read per request instead of three.
- `saveManifest()` calls `revalidateTag("manifest")` after it writes. Every admin save goes through `mutateManifest` → `saveManifest`, so admin edits show on the next request. The existing `revalidatePath("/", "layout")` calls in the admin routes are untouched and still purge the rendered pages.
- A failed read now throws inside the cached function, so a failure is **never stored**. It still falls back to the empty store for that one render, as before. A 404 ("no manifest yet") is a real answer and is cached.
- `getManifest({ fresh: true })` (the admin panel and the health check) still bypasses every cache.
- Changes made outside the admin, such as editing the JSON by hand in the Cloudinary console, show within 5 minutes.

**Effort:** S. One file, and the admin routes did not need to change.

### 2. Gallery: every image switch is a fresh download

**Evidence**
- `components/ProductView.tsx:17` and `:31`: a single `<Image>` whose `src` changes with `active`. Nothing loads before the tap. The thumbnails use `sizes` of 64/80 px, so they are different files and do not warm the cache for the main image.
- One product image, measured on a cold edge: `w_828` is 118 KB and `w_1200` is 248 KB. The first response for a width took **1.1–1.9 s**, against **0.4 s** once cached.
- `ProductView` was not keyed by product, so moving to a related product kept the old image index.

**User-visible effect:** after tapping an arrow or a thumbnail, the old picture stays on screen for about 0.5–2 s on a phone before the new one appears.

**Fix (done, `3e787bb`):**
- The images are stacked layers with the same `sizes`, so the browser picks the same file it would for the main image. Only the first one is `priority`.
- Once the first image has loaded, the previous and next images are mounted and download in the background. Images already viewed stay mounted.
- The visible layer switches only after the target image has loaded, so a slow image never shows an empty frame. The counter and the thumbnail outline update at once.
- The look is unchanged: same frame, an instant swap, no animation.
- `ProductView` is now keyed by `product.id` in `app/product/page.tsx`.

**Effort:** S.

### 3. Image delivery

**Evidence**
- `components/CartDrawer.tsx:37`: a raw `<img src={l.image}>` loads the **original upload** into an 80 px box. The drawer is always in the DOM (it is mounted in the layout), so these images load eagerly on every page while the cart has items. For one product that is **271 KB, against 13 KB at 256 px**.
- `lib/cloudinaryLoader.ts:1-4` only rewrote Cloudinary URLs. The Unsplash demo art (`config/demo.ts:3`) is used for the home hero, which is the LCP image (`app/page.tsx:40`), the story image, the Instagram tiles and the fallback card images. Those URLs went out unchanged, so all 8 srcset entries pointed to the same fixed 1600 px or 900 px file. The live preload tag showed this.
- `next.config.mjs` used the default `deviceSizes`: 8 widths up to 3840. Each width is a separate Cloudinary derivation, and each is slow the first time anyone asks for it (#2). The 2048 and 3840 widths only reached large desktop screens.
- The first cards on `/category` and `/finish` (`app/category/page.tsx:31`, `app/finish/page.tsx:27`) are the LCP element on a phone, but they had no `priority`.

**User-visible effect:** a heavier first load whenever the cart has items, more images that are slow the first time, and a slightly later LCP on the category and finish pages.

**Fix (done, `2ece4d4`):**
- Cart thumbnails go through the loader at 256 px, with `loading="lazy"` (nothing loads until the drawer opens).
- The loader sets the Unsplash `w=` per width.
- `deviceSizes` is now `[640, 828, 1080, 1200, 1920]`.
- `priority` on the first row of cards on `/category` and `/finish`.

**Effort:** S.

### 4. Product and shop pages are dynamic, and a splash covers every navigation to them (next to do)

**Evidence**
- The product URL is `/product?slug=…` (`app/product/page.tsx:10`), and `/shop` reads `searchParams` (`app/shop/page.tsx:13`). Both are `ƒ` in the build table, so the CDN never caches them. A `<Link>` prefetch only fetches up to the nearest `loading.tsx`.
- `app/loading.tsx:11` is a full-screen, fixed white splash at `z-[100]`. Every navigation to a dynamic page hides the whole current page, header included, until the server responds. That makes each tap feel like a full reload.

**User-visible effect:** each tap to a product shows the splash, then waits for a serverless render. With #1 fixed, the render itself is cheap (about 30–60 ms locally). What remains is the network round trip plus any function cold start.

**Fix (not done):**
- Add `app/product/[slug]/page.tsx` with `generateStaticParams` and ISR, so products are prerendered and fully prefetched. Redirect `/product?slug=` to the new URL so existing links, the sitemap and WhatsApp messages keep working.
- For `/shop`, read the filters with `useSearchParams` on the client and make the page static.
- Optionally, give `/product` and `/shop` their own `loading.tsx` that keeps the header visible. That changes the look, so it needs the owner's approval.

**Effort:** M. Left out of this branch because it changes URLs and `/shop`, which the `feature/search-stock` branch is also changing (`/shop?q=`).

### 5. A failed read becomes an empty store

**Evidence:** `lib/cloudinary.ts:90` (before) returned the fallback on any error, and `getManifest` turned that into an empty catalog. ISR then served that page for up to 60 s.

**Fix:** partly done in `b295d9c`: failures are no longer written to the data cache. The rest of the fix is to throw on a transient failure during ISR regeneration, so Next keeps serving the last good page. That needs care so `next build` without credentials still works. **Effort:** S.

### 6. `/shop` sends the whole catalog

**Evidence:** `app/shop/page.tsx:21` passes every product, with all image records and descriptions, into the `ShopView` client component, which renders every card (`components/ShopView.tsx:86`). On the live site `/shop` is 150 KB of HTML and RSC payload today, and that grows with each product.

**Fix:** pass only what a card needs (id, slug, name, price, mrp, code, inStock, createdAt, first image). Paginate or virtualise when the catalog gets large. **Effort:** M. Not done here, because the search branch also touches `/shop`.

### Checked, not a problem

- **Fonts:** the one web font is a self-hosted woff2 loaded through `next/font/local` with `display: swap` and preloaded. Headings use the system Georgia, so nothing blocks rendering.
- **JavaScript:** 87.2 kB shared, at most 104 kB First Load JS per page. Small for the App Router.
- **Middleware** matches only `/admin` and `/api/admin`, so storefront requests skip it.
- **Uploads** are re-encoded to WebP and resized in the browser before upload, and Cloudinary serves them with `f_auto,q_auto`.
- **`<Link>` prefetch** is on by default. It is fully effective for the static pages (`/`, `/category`, `/finish`) and limited by #4 for the others.

## Before / after

### Build (`npm run build`, Next 14.2.15, no Cloudinary credentials at build time)

| Route | Before | After |
|-------|--------|-------|
| `/` | ○ static, 2.4 kB, 101 kB First Load JS | ○ static, 2.48 kB, 101 kB |
| `/category` | ○, 329 B, 99.3 kB | ○, 448 B, 99.4 kB |
| `/finish` | ○, 329 B, 99.3 kB | ○, 448 B, 99.4 kB |
| `/checkout` | ○, 4.1 kB, 98.1 kB | ○, 4.1 kB, 98.1 kB |
| `/product` | ƒ dynamic, 4.31 kB, 103 kB | ƒ dynamic, 4.56 kB, 104 kB |
| `/shop` | ƒ, 3.94 kB, 103 kB | ƒ, 4.02 kB, 103 kB |
| `/info` | ƒ, 175 B, 94.2 kB | ƒ, 175 B, 94.2 kB |
| `/admin` | ƒ, 7.61 kB, 94.8 kB | ƒ, 7.61 kB, 94.8 kB |
| Shared JS | 87.2 kB | 87.2 kB |

Which routes are static and which are dynamic is unchanged; making them static is #4. The JS cost of the fixes is about 0.1–0.25 kB.

### Requests to Cloudinary per page view

Measured with `next start` against a local mock of the Cloudinary Admin, upload and raw-delivery endpoints. The mock is connected through the SDK's `upload_prefix` setting and counts every call. The live account was not touched.

| | Before (`4d55f7d`) | After (`perf/speed`) |
|---|---|---|
| Admin API calls, 10 product views | **30** | **0** (cache warm) |
| Admin API calls, 10 shop views | **20** | **0** |
| Server time per product view (local, mock API answering instantly) | n/a | 30–60 ms |
| Cost to refill the cache after an admin save | n/a | 1 Admin API call + 1 JSON download, shared by every page |

### Admin save → storefront (tested end to end against the mock)

1. Seed the mock with announcement `SEED-ANNOUNCEMENT` and warm the caches.
2. Log in through `/api/admin/login` and `POST /api/admin/announcement` with `FRESH-AFTER-SAVE-1`.
3. The **first** request after the save showed the new text on `/product`, `/shop`, `/` and `/category`.
4. `PATCH /api/admin/products` (rename plus a new price) showed on the very next `/product`, `/shop` and `/` request.

### Images

| | Before | After |
|---|---|---|
| Cart thumbnail, per line, every page load | 271 KB original, eager | ~13 KB (256 px), only when the drawer opens |
| Home hero on a 2× phone | 1600 px file (42 KB) for every width | 828 px file (20 KB) |
| Gallery "next" tap | New 118–248 KB download, first byte after 0.4–1.9 s | Already loaded: visible within 60 ms of the tap in the browser test (images proxied with an 800 ms delay standing in for a cold Cloudinary edge) |
| Distinct widths per image | 8 (640…3840) | 5 (640…1920) |

### Not measured

- Live TTFB after deploying. This branch has not been deployed. Expect `/product` and `/shop` server time to drop by the Admin API round trips (the 0.4–1.4 s gap above), minus whatever cold start remains.
- Freshness on Vercel itself. The test ran on `next start`, which keeps its data cache on the local filesystem. On Vercel, `revalidateTag` and `revalidatePath` go through Vercel's shared data cache. The Next.js API calls are the same, but run one save on a preview deploy to confirm.
