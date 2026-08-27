import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getManifest } from "@/lib/cloudinary";
import { BRAND } from "@/config/brand";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import BackBar from "@/components/BackBar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import CartToast from "@/components/CartToast";
import WhatsAppButton from "@/components/WhatsAppButton";
import CookieNotice from "@/components/CookieNotice";

export const metadata: Metadata = {
  title: { default: `${BRAND.name} — ${BRAND.tagline}`, template: `%s · ${BRAND.name}` },
  description: BRAND.tagline,
  metadataBase: new URL(BRAND.siteUrl),
};

export const revalidate = 60;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const m = await getManifest();
  const finishes = [...m.finishes].sort((a, b) => a.order - b.order).map((f) => ({ id: f.id, slug: f.slug, name: f.name }));
  const types = [...m.productTypes].sort((a, b) => a.order - b.order).map((t) => ({ id: t.id, slug: t.slug, name: t.name }));
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <AnnouncementBar announcement={m.announcement} />
        <Header finishes={finishes} />
        <BackBar />
        <div className="flex-1">{children}</div>
        <Footer finishes={finishes} types={types} />
        <CartDrawer />
        <CartToast />
        <WhatsAppButton />
        <CookieNotice />
      </body>
    </html>
  );
}
