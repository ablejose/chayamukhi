"use client";
import React from "react";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cart } from "@/lib/cart";
import { formatINR } from "@/lib/format";
import type { Product } from "@/lib/collections";
import ProductCard from "./ProductCard";
import { demoProductImage } from "@/config/demo";
import { IconChevron } from "./icons";

export default function ProductView({ product, related, finishName, typeName }: { product: Product; related: Product[]; finishName?: string; typeName?: string }) {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<string | null>("details");
  const cover = product.images[active]?.url ?? product.images[0]?.url ?? demoProductImage(product.id);

  const addToCart = () => cart.add({ productId: product.id, slug: product.slug, name: product.name, price: product.price, image: product.images[0]?.url ?? "" });
  const buyNow = () => { addToCart(); router.push("/checkout"); };

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 pt-4">
      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-cream">
            {cover ? <Image src={cover} alt={product.name} fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" priority /> : <div className="flex h-full items-center justify-center text-xs uppercase tracking-widest text-gray-400">No image</div>}
          </div>
          {product.images.length > 1 ? (
            <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto">
              {product.images.map((im, i) => (
                <button key={im.publicId} onClick={() => setActive(i)} className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border ${i === active ? "border-ink" : "border-transparent"}`}>
                  <Image src={im.url} alt={`${product.name} ${i + 1}`} fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Info */}
        <div>
          {(finishName || typeName) ? <p className="mb-2 text-[11px] uppercase tracking-[0.25em] text-gold">{[finishName, typeName].filter(Boolean).join(" · ")}</p> : null}
          <h1 className="font-serif text-3xl text-ink">{product.name}</h1>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-2xl font-medium">{formatINR(product.price)}</span>
            {product.mrp ? <span className="text-base text-gray-400 line-through">{formatINR(product.mrp)}</span> : null}
          </div>
          {product.description ? <p className="mt-5 text-sm leading-relaxed text-gray-600">{product.description}</p> : null}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button disabled={!product.inStock} onClick={addToCart} className="flex-1 rounded-full border border-ink py-3 text-[11px] uppercase tracking-widest transition hover:bg-ink hover:text-white disabled:opacity-40">
              {product.inStock ? "Add to Cart" : "Sold Out"}
            </button>
            <button disabled={!product.inStock} onClick={buyNow} className="flex-1 rounded-full bg-ink py-3 text-[11px] uppercase tracking-widest text-white transition hover:bg-gold disabled:opacity-40">
              Buy it Now
            </button>
          </div>

          <div className="mt-8 divide-y divide-black/10 border-y border-black/10">
            <Accordion id="details" open={open} setOpen={setOpen} title="Product Details">
              <ul className="list-disc space-y-1 pl-5">
                <li>Finish: {finishName ?? "—"}</li>
                <li>Category: {typeName ?? "—"}</li>
                <li>Skin-friendly, lightweight imitation jewellery</li>
              </ul>
            </Accordion>
            <Accordion id="shipping" open={open} setOpen={setOpen} title="Shipping & Returns">
              <p>Dispatched within 2–4 business days across India. Easy 7-day returns on unused items. Orders are confirmed over WhatsApp.</p>
            </Accordion>
          </div>
        </div>
      </div>

      {related.length ? (
        <section className="mt-20">
          <h2 className="mb-6 font-serif text-2xl text-ink">You May Also Like</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (<ProductCard key={p.id} p={p} />))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function Accordion({ id, open, setOpen, title, children }: { id: string; open: string | null; setOpen: (v: string | null) => void; title: string; children: React.ReactNode }) {
  const isOpen = open === id;
  return (
    <div className="py-1">
      <button onClick={() => setOpen(isOpen ? null : id)} className="flex w-full items-center justify-between py-3 text-sm uppercase tracking-widest">
        {title}
        <IconChevron className={isOpen ? "rotate-180 transition" : "transition"} width={16} height={16} />
      </button>
      {isOpen ? <div className="pb-4 text-sm leading-relaxed text-gray-600">{children}</div> : null}
    </div>
  );
}
