// Demo/sample imagery (verified reachable). Used as section art and as
// fallbacks when a finish/product has no real Cloudinary image yet.
const U = (id: string, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const DEMO_GALLERY: string[] = [
  U("1515562141207-7a88fb7ce338"),
  U("1611591437281-460bfbe1220a"),
  U("1599643478518-a784e5dc4c8f"),
  U("1535632066927-ab7c9ab60908"),
  U("1602173574767-37ac01994b2a"),
  U("1573408301185-9146fe634ad0"),
  U("1611652022419-a9419f74343d"),
  U("1512163143273-bde0e3cc7407"),
  U("1506630448388-4e683c67ddb0"),
  U("1620656798579-1984d9e87df7"),
];

export const DEMO_IMAGES = {
  hero: U("1515562141207-7a88fb7ce338", 1600),
  story: U("1599643478518-a784e5dc4c8f", 1200),
  instagram: [
    U("1611591437281-460bfbe1220a"),
    U("1535632066927-ab7c9ab60908"),
    U("1602173574767-37ac01994b2a"),
    U("1573408301185-9146fe634ad0"),
    U("1611652022419-a9419f74343d"),
    U("1512163143273-bde0e3cc7407"),
  ],
};

const FINISH_IMAGE: Record<string, string> = {
  "gold-plated": U("1515562141207-7a88fb7ce338"),
  "silver-plated": U("1611591437281-460bfbe1220a"),
  "antique": U("1599643478518-a784e5dc4c8f"),
  "german-silver": U("1535632066927-ab7c9ab60908"),
  "oxidized": U("1602173574767-37ac01994b2a"),
  "anti-tarnish": U("1573408301185-9146fe634ad0"),
  "style-accents": U("1611652022419-a9419f74343d"),
};

function hashIndex(seed: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % mod;
}

export function demoFinishImage(slug: string): string {
  return FINISH_IMAGE[slug] ?? DEMO_GALLERY[hashIndex(slug, DEMO_GALLERY.length)];
}
export function demoProductImage(seed: string): string {
  return DEMO_GALLERY[hashIndex(seed, DEMO_GALLERY.length)];
}
