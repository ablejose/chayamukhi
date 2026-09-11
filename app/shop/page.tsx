import { getManifest } from "@/lib/cloudinary";
import { allProducts } from "@/lib/collections";
import ShopView from "@/components/ShopView";

export const revalidate = 60;
export const metadata = {
  title: "Shop All",
  description: "Shop all imitation jewellery at Chayamukhi — anti-tarnish chains, German silver, oxidised, antique and gold-plated necklace sets, earrings, bangles and rings. Pan-India delivery, WhatsApp checkout.",
  alternates: { canonical: "/shop" },
  openGraph: { title: "Shop All · Chayamukhi", url: "/shop" },
};

export default async function ShopPage({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const m = await getManifest();
  const products = allProducts(m);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const viewKey = ["f", one(searchParams.finish) ?? "", "t", one(searchParams.type) ?? "", "s", one(searchParams.sort) ?? "", "q", one(searchParams.q) ?? "", "v", one(searchParams.view) ?? ""].join("|");
  return (
    <ShopView
      key={viewKey}
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
