export const BRAND = {
  name: "CHAYAMUKHI",
  tagline: "Imitation jewellery for everyday elegance",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "917559877705",
  currency: "INR" as const,
  currencySymbol: "₹",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://chayamukhi.in",
  freeShipThreshold: 0,
  contact: { email: "", phone: "+91 75598 77705", location: "Kerala, India" },
  social: { instagram: "", facebook: "", youtube: "" },
} as const;

export const FINISHES = [
  { slug: "gold-plated", name: "Gold Plated" },
  { slug: "silver-plated", name: "Silver Plated" },
  { slug: "antique", name: "Antique" },
  { slug: "german-silver", name: "German Silver" },
  { slug: "oxidized", name: "Oxidized" },
  { slug: "anti-tarnish", name: "Anti-Tarnish" },
  { slug: "style-accents", name: "Style Accents" },
] as const;

export const PRODUCT_TYPES = [
  { slug: "chains", name: "Chains" },
  { slug: "necklace-sets", name: "Necklace Sets" },
  { slug: "earrings", name: "Earrings" },
  { slug: "bracelets-bangles", name: "Bracelets & Bangles" },
  { slug: "rings", name: "Rings" },
  { slug: "kadas", name: "Kadas" },
  { slug: "hair-accessories", name: "Hair Accessories" },
  { slug: "hip-chains", name: "Hip Chains" },
] as const;

export const NAV = [
  { label: "Shop All", href: "/shop" },
  { label: "By Metal & Finish", href: "/finish" },
  { label: "By Style & Category", href: "/shop?view=style" },
  { label: "Everyday Essentials", href: "/shop?finish=anti-tarnish" },
  { label: "New In", href: "/shop?sort=new" },
] as const;
