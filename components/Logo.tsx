/**
 * Chayamukhi "CM" monogram — exact vector of the brand mark.
 * Served as a static gold SVG from /public/logo.svg (transparent background),
 * so the monogram is always golden and the file is cached once by the browser.
 */

// Intrinsic aspect ratio of /public/logo.svg (viewBox 1172 x 1013).
const LOGO_W = 1172;
const LOGO_H = 1013;

export function LogoMark({
  size = 28,
  className = "",
  decorative = false,
  alt = "Chayamukhi",
}: {
  size?: number;
  className?: string;
  decorative?: boolean;
  alt?: string;
}) {
  const width = Math.round((size * LOGO_W) / LOGO_H);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG; next/image is routed through the Cloudinary loader here
    <img
      src="/logo.svg"
      width={width}
      height={size}
      alt={decorative ? "" : alt}
      aria-hidden={decorative || undefined}
      className={className}
    />
  );
}

/**
 * Brand wordmark: the golden monogram followed by "Chayamukhi" in a running script.
 * Logo sits to the LEFT of the text. Only the monogram is gold; the wordmark text
 * keeps the original dark (ink) colour.
 */
export function Wordmark({
  markSize = 28,
  textClassName = "text-2xl",
  className = "",
  gap = "gap-2.5",
}: {
  markSize?: number;
  textClassName?: string;
  className?: string;
  gap?: string;
}) {
  return (
    <span className={`inline-flex items-center ${gap} ${className}`}>
      <LogoMark size={markSize} decorative className="shrink-0" />
      <span className={`font-script leading-none text-ink ${textClassName}`}>Chayamukhi</span>
    </span>
  );
}
