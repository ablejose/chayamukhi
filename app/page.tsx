import Link from "next/link";
import Image from "next/image";
import { getManifest } from "@/lib/cloudinary";
import { newIn } from "@/lib/collections";
import { BRAND } from "@/config/brand";
import ProductCard from "@/components/ProductCard";

export const revalidate = 60;

export default async function HomePage() {
  const m = await getManifest();
  const finishes = [...m.finishes].sort((a, b) => a.order - b.order);
  const fresh = newIn(m, 8);

  return (
    <main>
      {/* Hero */}
      <section className="relative flex min-h-[62vh] items-center justify-center overflow-hidden bg-gradient-to-b from-sand to-cream">
        <div className="reveal mx-auto max-w-2xl px-6 text-center">
          <p className="mb-4 text-[11px] uppercase tracking-[0.35em] text-gold">Imitation Jewellery · Made in India</p>
          <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl md:text-6xl">Everyday elegance,<br />effortlessly worn</h1>
          <p className="mx-auto mt-5 max-w-md text-sm text-gray-600">{BRAND.tagline}. Anti-tarnish finishes, timeless designs, delivered across India.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/shop" className="rounded-full bg-ink px-7 py-3 text-[11px] uppercase tracking-widest text-white transition hover:bg-gold">Shop All</Link>
            <Link href="/finish" className="rounded-full border border-ink px-7 py-3 text-[11px] uppercase tracking-widest transition hover:bg-ink hover:text-white">By Finish</Link>
          </div>
        </div>
      </section>

      {/* Finish grid */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 text-center">
          <h2 className="font-serif text-2xl text-ink sm:text-3xl">Shop by Metal &amp; Finish</h2>
          <p className="mt-2 text-sm text-gray-500">Seven finishes, one signature look.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {finishes.map((f) => (
            <Link key={f.id} href={`/shop?finish=${f.slug}`} className="group relative flex aspect-[4/5] items-end overflow-hidden rounded-xl bg-gradient-to-br from-sand to-[#e8dcc9]">
              {f.cardImage ? (
                <Image src={f.cardImage} alt={f.name} fill sizes="(max-width:768px) 50vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" />
              ) : null}
              <div className="relative z-10 w-full bg-gradient-to-t from-black/55 to-transparent p-4">
                <span className="font-serif text-lg text-white drop-shadow">{f.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* New In */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-serif text-2xl text-ink sm:text-3xl">New In</h2>
          <Link href="/shop?sort=new" className="text-[11px] uppercase tracking-widest text-gray-500 hover:text-gold">View all</Link>
        </div>
        {fresh.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {fresh.map((p) => (<ProductCard key={p.id} p={p} />))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-black/15 py-16 text-center text-sm text-gray-400">New arrivals will appear here once products are added in the admin panel.</p>
        )}
      </section>

      {/* Brand story */}
      <section className="bg-cream">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-2">
          <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-sand to-[#e8dcc9]" />
          <div>
            <p className="mb-3 text-[11px] uppercase tracking-[0.3em] text-gold">Our Story</p>
            <h3 className="font-serif text-3xl text-ink">Jewellery for every day, not just occasions</h3>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">{BRAND.name} brings together anti-tarnish finishes and contemporary Indian design so you can wear something special every single day — without the upkeep of fine jewellery.</p>
            <Link href="/shop?finish=anti-tarnish" className="mt-6 inline-block rounded-full border border-ink px-6 py-3 text-[11px] uppercase tracking-widest transition hover:bg-ink hover:text-white">Everyday Essentials</Link>
          </div>
        </div>
      </section>

      {/* Instagram strip */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h3 className="mb-6 text-center font-serif text-2xl text-ink">@chayamukhi on Instagram</h3>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (<div key={i} className="aspect-square rounded-lg bg-gradient-to-br from-sand to-[#e8dcc9]" />))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 md:grid-cols-3">
          {[
            { q: "The anti-tarnish pieces have lasted months of daily wear. Genuinely impressed.", a: "Ananya, Kochi" },
            { q: "Ordering over WhatsApp was so simple and delivery was quick.", a: "Meera, Kozhikode" },
            { q: "Elegant designs at a price that makes sense. My new go-to.", a: "Fathima, Thrissur" },
          ].map((t, i) => (
            <figure key={i} className="text-center">
              <blockquote className="font-serif text-lg leading-relaxed">&ldquo;{t.q}&rdquo;</blockquote>
              <figcaption className="mt-4 text-[11px] uppercase tracking-widest text-white/60">{t.a}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}
