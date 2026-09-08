import { LogoMark } from "@/components/Logo";

/**
 * Route-level loading UI (Next.js App Router).
 * A plain white full-screen splash showing only the golden monogram, centred,
 * with a slight bounce. It renders with zero client JS and is removed the instant
 * the page is ready, so it never adds perceptible lag.
 */
export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
      <LogoMark size={56} className="animate-logoBounce text-gold" />
    </div>
  );
}
