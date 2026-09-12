import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { getManifest } from "@/lib/cloudinary";

// "Amsterdam Four" signature script for the "Chayamukhi" wordmark, self-hosted via
// next/font/local (build time, no runtime request), so it never blocks or lags the page.
const brandScript = localFont({
  src: "./fonts/AmsterdamFour.woff2",
  display: "swap",
  variable: "--font-script",
});
import { BRAND } from "@/config/brand";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import BackBar from "@/components/BackBar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import CartToast from "@/components/CartToast";
import WhatsAppButton from "@/components/WhatsAppButton";
import CookieNotice from "@/components/CookieNotice";

const DESCRIPTION =
  "Chayamukhi — shop imitation jewellery online from Guruvayoor, Kerala. Anti-tarnish chains, German silver, oxidised, antique and gold-plated necklace sets, earrings, bangles and rings. Pan-India delivery, easy WhatsApp checkout.";

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.siteUrl),
  title: {
    default: "Imitation Jewellery in Guruvayoor | Chayamukhi",
    template: "%s · Chayamukhi",
  },
  description: DESCRIPTION,
  applicationName: BRAND.name,
  keywords: [
    "imitation jewellery",
    "imitation jewellery in Guruvayoor",
    "imitation jewellery Guruvayoor",
    "artificial jewellery Guruvayoor",
    "imitation jewellery Guruvayur",
    "imitation jewellery Thrissur",
    "fashion jewellery Kerala",
    "anti-tarnish jewellery",
    "German silver jewellery",
    "oxidised jewellery",
    "gold plated jewellery",
    "antique jewellery",
    "necklace sets",
    "jhumkas",
    "bangles online",
    "Chayamukhi",
  ],
  authors: [{ name: BRAND.name }],
  creator: BRAND.name,
  publisher: BRAND.name,
  category: "shopping",
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: BRAND.name, statusBarStyle: "default" },
  formatDetection: { telephone: true, address: true, email: false },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: "Imitation Jewellery in Guruvayoor | Chayamukhi",
    description: DESCRIPTION,
    url: BRAND.siteUrl,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Imitation Jewellery in Guruvayoor | Chayamukhi",
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
};

export const viewport: Viewport = {
  themeColor: "#1c1917",
  width: "device-width",
  initialScale: 1,
};

export const revalidate = 60;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const m = await getManifest();
  const finishes = [...m.finishes].sort((a, b) => a.order - b.order).map((f) => ({ id: f.id, slug: f.slug, name: f.name }));
  const types = [...m.productTypes].sort((a, b) => a.order - b.order).map((t) => ({ id: t.id, slug: t.slug, name: t.name }));

  const storeLd = {
    "@context": "https://schema.org",
    "@type": "JewelryStore",
    "@id": `${BRAND.siteUrl}/#store`,
    name: BRAND.name,
    url: BRAND.siteUrl,
    image: `${BRAND.siteUrl}/opengraph-image.png`,
    logo: `${BRAND.siteUrl}/icon.png`,
    description: DESCRIPTION,
    telephone: BRAND.contact.phone,
    priceRange: "₹₹",
    currenciesAccepted: "INR",
    paymentAccepted: "Cash, UPI, WhatsApp",
    address: {
      "@type": "PostalAddress",
      streetAddress: "1st Floor, Madhavi Business Complex, Puthanpalli",
      addressLocality: "Guruvayoor",
      addressRegion: "Kerala",
      postalCode: "680103",
      addressCountry: "IN",
    },
    areaServed: [
      { "@type": "City", name: "Guruvayoor" },
      { "@type": "AdministrativeArea", name: "Thrissur" },
      { "@type": "AdministrativeArea", name: "Kerala" },
      { "@type": "Country", name: "India" },
    ],
    sameAs: [BRAND.social.instagram ? `https://instagram.com/${BRAND.social.instagram}` : ""].filter(Boolean),
  };

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BRAND.siteUrl}/#website`,
    name: BRAND.name,
    url: BRAND.siteUrl,
    inLanguage: "en-IN",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${BRAND.siteUrl}/shop?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en" className={brandScript.variable}>
      <body className="flex min-h-screen flex-col">
        <AnnouncementBar announcement={m.announcement} />
        <Header finishes={finishes} types={types} />
        <BackBar />
        <div className="flex-1">{children}</div>
        <Footer finishes={finishes} types={types} />
        <CartDrawer />
        <CartToast />
        <WhatsAppButton />
        <CookieNotice />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }} />
      </body>
    </html>
  );
}
