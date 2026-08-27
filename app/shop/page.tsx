import { getManifest } from "@/lib/cloudinary";
import { allProducts } from "@/lib/collections";
import ShopView from "@/components/ShopView";

export const revalidate = 60;
export const metadata = { title: "Shop" };

export default async function ShopPage({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const m = await getManifest();
  const products = allProducts(m);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return (
    <ShopView
      products={products}
      finishes={m.finishes.map((f) => ({ id: f.id, slug: f.slug, name: f.name }))}
      types={m.productTypes}
      initial={{
        finish: one(searchParams.finish),
        type: one(searchParams.type),
        sort: one(searchParams.sort),
        q: one(searchParams.q),
        view: one(searchParams.view),
      }}
    />
  );
}
