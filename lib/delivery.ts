import { BRAND } from "@/config/brand";

/** Free delivery at or above this cart subtotal (INR). */
export const FREE_DELIVERY_THRESHOLD = BRAND.freeShipThreshold;
/** Flat delivery fee (INR) charged when the subtotal is below the free-delivery threshold. */
export const DELIVERY_FEE = BRAND.deliveryFee;

/** Delivery fee for a given cart subtotal. Free at or above FREE_DELIVERY_THRESHOLD. */
export function deliveryFor(subtotal: number): { fee: number; free: boolean } {
  const s = Number(subtotal) || 0;
  const free = s >= FREE_DELIVERY_THRESHOLD;
  return { fee: free ? 0 : DELIVERY_FEE, free };
}
