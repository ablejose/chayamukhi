import Link from "next/link";
import { BRAND } from "@/config/brand";

const PAGES: Record<string, { title: string; body: string[] }> = {
  "shipping-returns": { title: "Shipping & Returns", body: [
    "We dispatch all orders within 2–4 business days and deliver across India.",
    "Delivery timelines and charges are confirmed with you over WhatsApp when you place your order.",
    "Unused items in original condition can be returned within 7 days of delivery. Reach out on WhatsApp to start a return.",
  ] },
  "faq": { title: "Frequently Asked Questions", body: [
    "How do I place an order? Add items to your cart and check out — you'll be redirected to WhatsApp to confirm and arrange payment.",
    "Is the jewellery anti-tarnish? Our Anti-Tarnish (Everyday Essentials) range is specially coated for daily wear. Other finishes vary by design.",
    "How do I track my order? Use the Track Order page with your order number and phone.",
  ] },
  "privacy-policy": { title: "Privacy Policy", body: [
    "We only collect the details needed to fulfil your order — your name, contact number, and delivery address.",
    "We never sell your data. Order details are shared only with our fulfilment and delivery partners.",
  ] },
  "terms": { title: "Terms & Conditions", body: [
    "By placing an order you agree to our fulfilment and returns terms.",
    "Product colours may vary slightly from images due to lighting and screens.",
  ] },
  "refund-policy": { title: "Refund Policy", body: [
    "Refunds for eligible returns are processed within 5–7 business days of the returned item being received.",
    "Refunds are issued via the original payment method or as store credit, as agreed over WhatsApp.",
  ] },
};

export const revalidate = 3600;

export function generateMetadata({ searchParams }: { searchParams: { page?: string } }) {
  const p = searchParams.page ? PAGES[searchParams.page] : undefined;
  return { title: p ? p.title : "Information" };
}

export default function InfoPage({ searchParams }: { searchParams: { page?: string } }) {
  const key = searchParams.page ?? "";
  const page = PAGES[key];
  if (!page) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-serif text-3xl text-ink">Information</h1>
        <ul className="mt-6 space-y-2 text-sm">
          {Object.entries(PAGES).map(([slug, p]) => (<li key={slug}><Link href={`/info?page=${slug}`} className="text-gray-700 hover:text-gold">{p.title}</Link></li>))}
        </ul>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-gold">{BRAND.name}</p>
      <h1 className="font-serif text-3xl text-ink sm:text-4xl">{page.title}</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray-700">
        {page.body.map((para, i) => (<p key={i}>{para}</p>))}
      </div>
    </main>
  );
}
