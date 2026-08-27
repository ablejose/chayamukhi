import { FINISHES, PRODUCT_TYPES } from "@/config/brand";

export type CloudKey = "c1" | "c2" | "c3";
export const CLOUD_KEYS: CloudKey[] = ["c1", "c2", "c3"];

/** EVEN SPREAD: stable hash of an id → one of the 3 image accounts. */
export function cloudForId(id: string): CloudKey {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CLOUD_KEYS[h % CLOUD_KEYS.length];
}

export interface ProductImage { publicId: string; url: string; width: number; height: number; cloud: CloudKey; }
export interface Product {
  id: string; slug: string; name: string;
  finishId: string; typeId: string;
  price: number; mrp?: number; description?: string;
  inStock: boolean; createdAt: number; images: ProductImage[];
}
export interface Finish { id: string; slug: string; name: string; order: number; cardImage?: string; products: Product[]; }
export interface TypeDef { id: string; slug: string; name: string; order: number; }
export interface OfferItem { publicId: string; url: string; width: number; height: number; }
export interface Manifest {
  version: number; updatedAt: number;
  finishes: Finish[]; productTypes: TypeDef[]; offers: OfferItem[];
  announcement: { text: string; active: boolean };
}
export interface OrderLine { productId: string; name: string; qty: number; price: number; }
export interface OrderRecord {
  id: string; createdAt: number; total: number; lines: OrderLine[];
  customer: { name: string; phone: string; address: string; city: string; state: string; pincode: string; notes?: string };
}

export function slugify(input: string): string {
  const s = (input ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s.slice(0, 60) || "item";
}

export function emptyManifest(): Manifest {
  return {
    version: 1, updatedAt: 0,
    finishes: FINISHES.map((f, i) => ({ id: f.slug, slug: f.slug, name: f.name, order: i, products: [] })),
    productTypes: PRODUCT_TYPES.map((t, i) => ({ id: t.slug, slug: t.slug, name: t.name, order: i })),
    offers: [], announcement: { text: "", active: false },
  };
}

export function normalizeManifest(input: unknown): Manifest {
  const base = emptyManifest();
  if (!input || typeof input !== "object") return base;
  const m = input as Partial<Manifest>;
  base.version = typeof m.version === "number" ? m.version : 1;
  base.updatedAt = typeof m.updatedAt === "number" ? m.updatedAt : 0;
  if (m.announcement && typeof m.announcement.text === "string") base.announcement = { text: m.announcement.text, active: !!m.announcement.active };
  base.offers = Array.isArray(m.offers) ? m.offers.filter((o) => o && typeof (o as OfferItem).publicId === "string") : [];
  if (Array.isArray(m.productTypes) && m.productTypes.length) {
    base.productTypes = m.productTypes.filter((t) => t && typeof t.slug === "string")
      .map((t, i) => ({ id: t.id ?? t.slug, slug: t.slug, name: t.name ?? t.slug, order: t.order ?? i }));
  }
  const src = Array.isArray(m.finishes) ? m.finishes : [];
  if (src.length) {
    base.finishes = src.filter((f) => f && typeof f.slug === "string").map((f, i) => ({
      id: f.id ?? f.slug, slug: f.slug, name: f.name ?? f.slug, order: typeof f.order === "number" ? f.order : i,
      cardImage: typeof f.cardImage === "string" ? f.cardImage : undefined,
      products: Array.isArray(f.products) ? f.products.filter((p) => p && typeof (p as Product).id === "string").map((p) => ({
        id: p.id, slug: p.slug ?? slugify(p.name ?? p.id), name: p.name ?? p.id,
        finishId: p.finishId ?? f.slug, typeId: p.typeId ?? "",
        price: typeof p.price === "number" ? p.price : 0, mrp: typeof p.mrp === "number" ? p.mrp : undefined,
        description: typeof p.description === "string" ? p.description : undefined,
        inStock: p.inStock !== false, createdAt: typeof p.createdAt === "number" ? p.createdAt : 0,
        images: Array.isArray(p.images) ? p.images.filter((im) => im && typeof (im as ProductImage).publicId === "string") : [],
      })) : [],
    }));
  }
  return base;
}

export function allProducts(m: Manifest): Product[] { return m.finishes.flatMap((f) => f.products); }
export function productsByType(m: Manifest, typeSlug: string): Product[] { return allProducts(m).filter((p) => p.typeId === typeSlug); }
export function newIn(m: Manifest, limit = 24): Product[] { return [...allProducts(m)].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit); }
