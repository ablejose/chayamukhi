import Link from "next/link";
import { getManifest } from "@/lib/cloudinary";
import { allProducts } from "@/lib/collections";
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

  return <ProductView product={product} related={related} finishName={finishName} typeName={typeName} />;
}

export async function generateMetadata({ searchParams }: { searchParams: { slug?: string | string[] } }) {
  const slug = Array.isArray(searchParams.slug) ? searchParams.slug[0] : searchParams.slug;
  const m = await getManifest();
  const product = allProducts(m).find((p) => p.slug === slug);
  return { title: product ? product.name : "Product" };
}
