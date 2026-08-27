# CHAYAMUKHI

Mobile-first, **database-less** imitation-jewellery e-commerce store for India.

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **No database** — the catalog is a single `manifest.json` stored as a raw resource on Cloudinary
- **3 Cloudinary accounts** — product images are spread evenly across `c1/c2/c3` by a stable hash
- **Cart** lives in the browser (`localStorage`)
- **Checkout** places the order via **WhatsApp** and logs it to `orders.json` on Cloudinary
- **Admin** (`/admin`) — HMAC-cookie auth, manage finishes / product types / products with direct-to-Cloudinary image upload

## Getting started

```bash
cp .env.example .env.local   # fill in the values (see below)
npm install
npm run dev
```

## Environment variables

Set these in Vercel (Project → Settings → Environment Variables) — **never commit secrets**:

| Variable | Purpose |
| --- | --- |
| `SESSION_SECRET` | Long random string for the admin HMAC cookie |
| `ADMIN_PASSWORD` | Admin login password |
| `NEXT_PUBLIC_SITE_URL` | e.g. `https://chayamukhi.in` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `917559877705` (E.164 without `+`) |
| `CLOUDINARY_C1_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Account 1 (also stores `manifest.json` + `orders.json`) |
| `CLOUDINARY_C2_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Account 2 (image spread) |
| `CLOUDINARY_C3_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Account 3 (image spread) |

If C2/C3 are not set, image routing falls back to C1 so uploads never hard-fail.

## Routes

Storefront: `/` · `/finish` · `/shop` (`?finish=` `?type=` `?sort=new` `?q=`) · `/product?slug=` · `/checkout` · `/info?page=` · `/track`
Admin: `/admin/login` · `/admin`
API (Node runtime): `/api/order` · `/api/track` · `/api/admin/*`

The first request auto-creates an empty manifest (the 7 finishes + 8 product types are seeded); add products from `/admin`.
