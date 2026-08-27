"use client";
import Link from "next/link";
import Image from "next/image";
import { cart } from "@/lib/cart";
import { formatINR, savePct } from "@/lib/format";
import type { Product } from "@/lib/collections";
import { demoProductImage } from "@/config/demo";

export default function ProductCard({ p }: { p: Product }) {
  const cover = p.images[0]?.url ?? demoProductImage(p.id);
  const pct = savePct(p.price, p.mrp);
  return (
    <div className="group">
      <Link href={`/product?slug=${p.slug}`} className="relative block aspect-square overflow-hidden rounded-lg bg-cream">
        <Image src={cover} alt={p.name} fill sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" />
        {pct ? <span className="absolute left-2 top-2 rounded bg-gold px-2 py-0.5 text-[10px] font-medium text-white">Save {pct}%</span> : null}
        {!p.inStock ? <span className="absolute right-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] uppercase text-white">Sold out</span> : null}
      </Link>
      <div className="mt-3">
        <Link href={`/product?slug=${p.slug}`} className="line-clamp-1 text-sm text-ink hover:text-gold">{p.name}</Link>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-medium">{formatINR(p.price)}</span>
          {p.mrp ? <span className="text-xs text-gray-400 line-through">{formatINR(p.mrp)}</span> : null}
        </div>
        <button
          disabled={!p.inStock}
          onClick={() => cart.add({ productId: p.id, slug: p.slug, name: p.name, price: p.price, image: cover ?? "" })}
          className="mt-3 w-full rounded-full border border-ink py-2 text-[11px] uppercase tracking-widest transition hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {p.inStock ? "Add to Cart" : "Sold Out"}
        </button>
      </div>
    </div>
  );
}
