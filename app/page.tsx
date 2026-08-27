import Link from "next/link";
import Image from "next/image";
import { getManifest } from "@/lib/cloudinary";
import { newIn } from "@/lib/collections";
import { BRAND } from "@/config/brand";
import { DEMO_IMAGES, demoFinishImage } from "@/config/demo";
import ProductCard from "@/components/ProductCard";

export const revalidate = 60;

const IG = "https://instagram.com/chayamukhi_jewellery";
const MAPS = "https://www.google.com/maps/search/?api=1&query=Chayamukhi%2C%201st%20Floor%2C%20Madhavi%20Business%20Complex%2C%20Puthanpalli%2C%20Guruvayur%2C%20Kerala%20680103";

const REVIEWS = [
  { q: "Bought a German silver necklace set for Onam and got so many compliments. A few gentle washes later the shine is exactly the same — completely worth it.", a: "Aparna R.", city: "Thrissur" },
  { q: "I was hesitant to buy jewellery online, but the WhatsApp updates kept me posted right up to delivery. The oxidised jhumkas are light and genuinely beautiful.", a: "Nithya Menon", city: "Ernakulam" },
  { q: "Picked up a few anti-tarnish chains for daily office wear. No skin darkening, no fading even after two months. Already planning my next order.", a: "Sneha Krishnan", city: "Kozhikode" },
];

function Stars() {
  return (
    <div className="mb-3 flex gap-0.5 text-gold" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88-5-4.87 7.1-1.01L12 2z" /></svg>
      ))}
    </div>
  );
}

export default async function HomePage() {
  const m = await getManifest();
  const finishes = [...m.finishes].sort((a, b) => a.order - b.order);
  const fresh = newIn(m, 4);

  return (
    <main>
      {/* Hero */}
      <section className="relative flex min-h-[64vh] items-center justify-center overflow-hidden">
        <Image src={DEMO_IMAGES.hero} alt="CHAYAMUKHI jewellery" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/55 to-cream/90" />
        <div className="reveal relative z-10 mx-auto max-w-2xl px-6 text-center">
          <p className="mb-4 text-[11px] uppercase tracking-[0.35em] text-gold">Imitation Jewellery · Made to last</p>
          <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl md:text-6xl">Everyday elegance,<br />effortlessly worn</h1>
          <p className="mx-auto mt-5 max-w-md text-sm text-ink/80">{BRAND.tagline}. Anti-tarnish finishes, timeless designs, delivered across India.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/shop" className="rounded-full bg-ink px-7 py-3 text-[11px] uppercase tracking-widest text-white transition hover:bg-gold">Shop All</Link>
            <Link href="/finish" className="rounded-full border border-ink bg-white/70 px-7 py-3 text-[11px] uppercase tracking-widest transition hover:bg-ink hover:text-white">By Finish</Link>
            <Link href="/category" className="rounded-full border border-ink bg-white/70 px-7 py-3 text-[11px] uppercase tracking-widest transition hover:bg-ink hover:text-white">By Style &amp; Category</Link>
            <Link href="/shop?finish=anti-tarnish" className="rounded-full border border-ink bg-white/70 px-7 py-3 text-[11px] uppercase tracking-widest transition hover:bg-ink hover:text-white">Everyday Essentials</Link>
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
            <Link key={f.id} href={`/shop?finish=${f.slug}`} className="group relative flex aspect-[4/5] items-end overflow-hidden rounded-xl bg-sand">
              <Image src={f.cardImage ?? demoFinishImage(f.slug)} alt={f.name} fill sizes="(max-width:768px) 50vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" />
              <div className="relative z-10 w-full bg-gradient-to-t from-black/60 to-transparent p-4">
                <span className="font-serif text-lg text-white drop-shadow">{f.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* New Arrivals */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-serif text-2xl text-ink sm:text-3xl">New Arrivals</h2>
          <Link href="/shop?sort=new" className="text-[11px] uppercase tracking-widest text-gray-500 hover:text-gold">View all</Link>
        </div>
        {fresh.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {fresh.map((p) => (<ProductCard key={p.id} p={p} />))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-black/15 py-16 text-center text-sm text-gray-400">New arrivals will appear here once products are added in the admin panel.</p>
        )}
      </section>

      {/* Brand story */}
      <section className="bg-cream">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-sand">
            <Image src={DEMO_IMAGES.story} alt="CHAYAMUKHI craftsmanship" fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" />
          </div>
          <div>
            <p className="mb-3 text-[11px] uppercase tracking-[0.3em] text-gold">Our Story</p>
            <h3 className="font-serif text-3xl text-ink">Jewellery for every day, not just occasions</h3>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">{BRAND.name} brings together anti-tarnish finishes and contemporary Indian design so you can wear something special every single day — without the upkeep of fine jewellery.</p>
            <Link href="/shop?finish=anti-tarnish" className="mt-6 inline-block rounded-full border border-ink px-6 py-3 text-[11px] uppercase tracking-widest transition hover:bg-ink hover:text-white">Everyday Essentials</Link>
          </div>
        </div>
      </section>

      {/* Instagram */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor" stroke="none" /></svg>
          </span>
          <h3 className="font-serif text-2xl text-ink sm:text-3xl">Follow us to keep in touch</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">Catch our latest arrivals, styling ideas and customer favourites first — and tag us in your looks to be featured.</p>
          <a href={IG} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full border border-ink px-6 py-2.5 text-[11px] uppercase tracking-widest transition hover:bg-ink hover:text-white">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor" stroke="none" /></svg>
            @chayamukhi_jewellery
          </a>
        </div>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {DEMO_IMAGES.instagram.map((src, i) => (
            <a key={i} href={IG} target="_blank" rel="noopener noreferrer" className="relative aspect-square overflow-hidden rounded-lg bg-sand">
              <Image src={src} alt={`Instagram post ${i + 1}`} fill sizes="(max-width:768px) 33vw, 16vw" className="object-cover transition duration-500 hover:scale-105" />
            </a>
          ))}
        </div>
      </section>

      {/* Customer reviews */}
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-10 text-center">
            <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-gold">Loved across Kerala</p>
            <h2 className="font-serif text-2xl sm:text-3xl">What our customers say</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {REVIEWS.map((t, i) => (
              <figure key={i} className="flex h-full flex-col rounded-2xl bg-white/5 p-6 text-left ring-1 ring-white/10">
                <Stars />
                <blockquote className="flex-1 text-sm leading-relaxed text-white/90">&ldquo;{t.q}&rdquo;</blockquote>
                <figcaption className="mt-5 flex items-center justify-between">
                  <span className="text-sm">{t.a} · <span className="text-white/60">{t.city}</span></span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wide text-white/70">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    Verified
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Visit Us */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid items-center gap-8 rounded-3xl border border-black/10 bg-cream p-8 md:grid-cols-[auto_1fr] md:p-12">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 1118 0z" /><circle cx="12" cy="10" r="3" /></svg>
          </span>
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-gold">Visit Us</p>
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">Chayamukhi</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">1st Floor, Madhavi Business Complex, Puthanpalli,<br />Guruvayur, Kerala 680103</p>
            <div className="mt-4 space-y-1 text-sm text-gray-700">
              <p className="flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                Mon&ndash;Sat: 9:30 AM &ndash; 8:00 PM
              </p>
              <p className="flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                Sunday: 10:00 AM &ndash; 7:00 PM
              </p>
            </div>
            <a href={MAPS} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[11px] uppercase tracking-widest text-white transition hover:bg-gold">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 1118 0z" /><circle cx="12" cy="10" r="3" /></svg>
              Get Directions
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
