import Link from "next/link";
import Image from "next/image";
import { getManifest } from "@/lib/cloudinary";
import { allProducts } from "@/lib/collections";
import { demoTypeImage } from "@/config/demo";

export const revalidate = 60;
export const metadata = { title: "By Style & Category" };

export default async function CategoryPage() {
  const m = await getManifest();
  const all = allProducts(m);
  const types = [...m.productTypes].sort((a, b) => a.order - b.order);
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
      <div className="mb-10 text-center">
        <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-gold">Collections</p>
        <h1 className="font-serif text-3xl text-ink sm:text-4xl">By Style &amp; Category</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-gray-500">Shop by the piece you are looking for, across every finish.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {types.map((t) => {
          const count = all.filter((p) => p.typeId === t.slug || p.typeId === t.id).length;
          return (
            <Link key={t.id} href={`/shop?type=${t.slug}`} className="group relative flex aspect-square items-end overflow-hidden rounded-2xl bg-sand shadow-sm">
              <Image src={demoTypeImage(t.slug)} alt={t.name} fill sizes="(max-width:640px) 50vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" />
              <div className="relative z-10 w-full bg-gradient-to-t from-black/70 via-black/25 to-transparent p-4">
                <span className="font-serif text-lg text-white drop-shadow">{t.name}</span>
                <span className="mt-0.5 block text-[11px] uppercase tracking-widest text-white/85">{count} {count === 1 ? "piece" : "pieces"}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
