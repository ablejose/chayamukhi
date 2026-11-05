/**
 * Product search shared by the search-bar dropdown and the /shop?q= results page,
 * so the suggestions and the full results always agree.
 *
 * Matches on product NAME and CODE (plus finish and category names, so "oxidised
 * jhumka" works). Codes match loosely: "CHM-012", "chm012", "chm 12" and "12" all
 * find CHM-012.
 */

/** One product as the search bar sees it. Short keys: this list is shipped to the browser. */
export interface SearchItem {
  /** name */ n: string;
  /** code, e.g. CHM-012 */ c?: string;
  /** slug */ s: string;
  /** cover image url */ i?: string;
  /** price */ p: number;
  /** finish name */ f?: string;
  /** category name */ t?: string;
  /** 1 = sold out */ x?: 1;
  /** createdAt, for tie-breaks (newest first) */ d: number;
}

/** Suggestions shown before the customer types anything, and cycled through the placeholder. */
export const DEFAULT_SEARCHES = [
  "Jhumkas",
  "Necklace sets",
  "Anti-tarnish chains",
  "German silver",
  "Oxidised earrings",
  "Bangles",
  "Kadas",
  "Hip chains",
] as const;

const lower = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
const alnum = (s: string) => lower(s).replace(/[^a-z0-9]/g, "");

// British/Indian vs. American spellings customers mix freely.
const SYNONYMS: Record<string, string> = { oxidized: "oxidised", jhumka: "jhumka", jumka: "jhumka", jumkas: "jhumka", jhumki: "jhumka" };
function canon(word: string): string {
  const w = SYNONYMS[word] ?? word;
  // Plurals: "chains" → "chain", "necklaces" → "necklace". Short words are left alone ("ring" stays).
  return w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w;
}
const words = (s: string) => lower(s).split(/[^a-z0-9]+/).filter(Boolean).map(canon);

/** The number inside a code ("CHM-012" → 12), or null. */
function codeNumber(s: string): number | null {
  const m = s.match(/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
}

function codeScore(code: string | undefined, q: string): number {
  if (!code) return 0;
  const cq = alnum(q);
  if (!cq) return 0;
  const cc = alnum(code);
  if (cc === cq) return 100;
  // "chm12" or "12" against CHM-012: same letters (or none typed) and the same number.
  const qn = codeNumber(cq), cn = codeNumber(cc);
  if (qn !== null && cn !== null && qn === cn) {
    const qLetters = cq.replace(/\d+$/, ""), cLetters = cc.replace(/\d+$/, "");
    if (!qLetters || cLetters.startsWith(qLetters)) return 95;
  }
  if (cq.length >= 3 && cc.startsWith(cq)) return 70;
  return 0;
}

/**
 * How well an item matches a query. 0 = no match. Every word typed must match
 * somewhere (name, code, finish or category); the score favours name hits at the
 * start of the name and exact code hits.
 */
export function scoreItem(item: Pick<SearchItem, "n" | "c" | "f" | "t">, query: string): number {
  const q = query.trim();
  if (!q) return 0;

  const byCode = codeScore(item.c, q);
  if (byCode >= 95) return byCode;

  const qWords = words(q);
  if (!qWords.length) return byCode;

  const nameWords = words(item.n);
  const otherWords = [...words(item.f ?? ""), ...words(item.t ?? ""), ...words(item.c ?? "")];
  const nameLower = lower(item.n);

  let score = 0;
  for (const w of qWords) {
    if (nameWords.some((x) => x === w)) score += 30;
    else if (nameWords.some((x) => x.startsWith(w))) score += 22;
    else if (w.length >= 3 && nameLower.includes(w)) score += 12;
    else if (otherWords.some((x) => x === w || x.startsWith(w))) score += 8;
    else return byCode; // a word that matches nothing rules the item out
  }
  if (nameLower.startsWith(lower(q))) score += 15;
  return Math.max(score, byCode);
}

/** Best matches first; in-stock pieces before sold-out ones, then newest. */
export function searchItems(items: SearchItem[], query: string, limit = Infinity): SearchItem[] {
  const scored: { it: SearchItem; s: number }[] = [];
  for (const it of items) {
    const s = scoreItem(it, query);
    if (s > 0) scored.push({ it, s });
  }
  scored.sort((a, b) => (b.s - a.s) || ((a.it.x ?? 0) - (b.it.x ?? 0)) || (b.it.d - a.it.d));
  return scored.slice(0, limit).map((x) => x.it);
}
