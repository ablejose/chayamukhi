import Link from "next/link";
import { BRAND } from "@/config/brand";

type FinishLite = { id: string; slug: string; name: string };
const INFO = [
  { label: "Shipping & Returns", href: "/info?page=shipping-returns" },
  { label: "FAQ", href: "/info?page=faq" },
  { label: "Privacy Policy", href: "/info?page=privacy-policy" },
  { label: "Terms", href: "/info?page=terms" },
  { label: "Refund Policy", href: "/info?page=refund-policy" },
];

export default function Footer({ finishes }: { finishes: FinishLite[] }) {
  return (
    <footer className="mt-20 border-t border-black/10 bg-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="font-serif text-lg tracking-[0.25em]">{BRAND.name}</div>
          <p className="mt-3 max-w-xs text-sm text-gray-600">{BRAND.tagline}. Handpicked imitation jewellery, delivered across India.</p>
        </div>
        <div>
          <h4 className="mb-3 text-[11px] uppercase tracking-widest text-gray-500">Shop by Finish</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            {finishes.map((f) => (<li key={f.id}><Link href={`/shop?finish=${f.slug}`} className="hover:text-gold">{f.name}</Link></li>))}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-[11px] uppercase tracking-widest text-gray-500">Information</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            {INFO.map((i) => (<li key={i.href}><Link href={i.href} className="hover:text-gold">{i.label}</Link></li>))}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-[11px] uppercase tracking-widest text-gray-500">Contact</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>{BRAND.contact.phone}</li>
            <li>{BRAND.contact.location}</li>
            <li><a href={`https://wa.me/${BRAND.whatsappNumber}`} className="hover:text-gold">WhatsApp us</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-black/10 py-5 text-center text-xs text-gray-500">© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</div>
    </footer>
  );
}
