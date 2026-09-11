import Link from "next/link";
import type { Metadata } from "next";
import { getManifest } from "@/lib/cloudinary";
import { allProducts } from "@/lib/collections";
import { BRAND } from "@/config/brand";
import ProductView from "@/components/ProductView";

export const revalidate = 60;

export default async function ProductPage({ searchParams }: { searchParams: { slug?: string | string[] } }) {
  const slug = Array.isArray(searchParams.slug) ? searchParams.slug[0] : searchParams.slug;
  const m = await getManifest();
  const all = allProducts(m);
  const product = all.find((p) => p.slug === slug);

  if (!product) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-serif text-2xl text-ink">Product not found</h1>
        <p className="mt-3 text-sm text-gray-500">This piece may have sold out or been removed.</p>
        <Link href="/shop" className="mt-6 inline-block rounded-full bg-ink px-6 py-3 text-[11px] uppercase tracking-widest text-white">Back to Shop</Link>
      </main>
    );
  }

  const finishName = m.finishes.find((f) => f.id === product.finishId)?.name;
  const typeName = m.productTypes.find((t) => t.id === product.typeId || t.slug === product.typeId)?.name;
  const related = all
    .filter((p) => p.id !== product.id && (p.finishId === product.finishId || p.typeId === product.typeId))
    .slice(0, 8);

  const canonical = `${BRAND.siteUrl}/product?slug=${encodeURIComponent(product.slug)}`;
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map((im) => im.url),
    description: product.description || `${product.name} — ${[finishName, typeName].filter(Boolean).join(" ")} imitation jewellery by ${BRAND.name}.`,
    sku: product.code || product.id,
    mpn: product.code || product.id,
    brand: { "@type": "Brand", name: BRAND.name },
    category: typeName,
    offers: {
      "@type": "Offer",
      url: canonical,
      priceCurrency: BRAND.currency,
      price: product.price,
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: BRAND.name },
    },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BRAND.siteUrl },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${BRAND.siteUrl}/shop` },
      { "@type": "ListItem", position: 3, name: product.name, item: canonical },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <ProductView product={product} related={related} finishName={finishName} typeName={typeName} />
    </>
  );
}

export async function generateMetadata({ searchParams }: { searchParams: { slug?: string | string[] } }): Promise<Metadata> {
  const slug = Array.isArray(searchParams.slug) ? searchParams.slug[0] : searchParams.slug;
  const m = await getManifest();
  const product = allProducts(m).find((p) => p.slug === slug);
  if (!product) return { title: "Product", robots: { index: false, follow: true } };

  const finishName = m.finishes.find((f) => f.id === product.finishId)?.name;
  const typeName = m.productTypes.find((t) => t.id === product.typeId || t.slug === product.typeId)?.name;
  const desc = product.description
    || `Buy ${product.name}${typeName ? ` — ${typeName}` : ""}${finishName ? `, ${finishName} finish` : ""} at ${BRAND.name}. ${BRAND.currencySymbol}${product.price.toLocaleString("en-IN")}. Pan-India delivery, WhatsApp checkout.`;
  const canonical = `/product?slug=${encodeURIComponent(product.slug)}`;
  const image = product.images[0]?.url;

  return {
    title: product.name,
    description: desc.slice(0, 300),
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: `${product.name} · ${BRAND.name}`,
      description: desc.slice(0, 300),
      url: canonical,
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: { card: "summary_large_image", title: `${product.name} · ${BRAND.name}`, description: desc.slice(0, 200), images: image ? [image] : undefined },
  };
}
