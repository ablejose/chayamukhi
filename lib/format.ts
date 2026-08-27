export function formatINR(n: number): string {
  return "₹" + (Number(n) || 0).toLocaleString("en-IN");
}
export function savePct(price: number, mrp?: number): number | null {
  if (!mrp || mrp <= price) return null;
  return Math.round(((mrp - price) / mrp) * 100);
}
