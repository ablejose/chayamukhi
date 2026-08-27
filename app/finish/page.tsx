import Link from "next/link";
import Image from "next/image";
import { getManifest } from "@/lib/cloudinary";

export const revalidate = 60;
export const metadata = { title: "By Metal & Finish" };

export default async function FinishPage() {
  const m = await getManifest();
  const finishes = [...m.finishes].sort((a, b) => a.order - b.order);
  return (
    <main className="mx-auto max-w-7xl px-4 py-14">
      <div className="mb-10 text-center">
        <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-gold">Collections</p>
        <h1 className="font-serif text-3xl text-ink sm:text-4xl">By Metal &amp; Finish</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-gray-500">Explore our range across seven distinct metal finishes.</p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {finishes.map((f) => (
          <Link key={f.id} href={`/shop?finish=${f.slug}`} className="group relative flex aspect-[3/2] items-end overflow-hidden rounded-2xl bg-gradient-to-br from-sand to-[#e8dcc9]">
            {f.cardImage ? (
              <Image src={f.cardImage} alt={f.name} fill sizes="(max-width:640px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" />
            ) : null}
            <div className="relative z-10 w-full bg-gradient-to-t from-black/55 to-transparent p-5">
              <span className="font-serif text-xl text-white drop-shadow">{f.name}</span>
              <span className="mt-1 block text-[11px] uppercase tracking-widest text-white/80">{f.products.length} {f.products.length === 1 ? "piece" : "pieces"}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
