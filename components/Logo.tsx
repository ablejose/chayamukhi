import type { SVGProps } from "react";

/**
 * Chayamukhi "CM" monogram.
 * Golden interlocking C + M — a C ring open on the right with the M nested into it.
 * Uses `currentColor`, so the color is set by the parent (e.g. `text-gold`),
 * and a transparent background so it sits on any surface (navbar, white splash, footer).
 */
export function LogoMark({
  size = 28,
  decorative = false,
  className = "",
  ...rest
}: { size?: number; decorative?: boolean; className?: string } & SVGProps<SVGSVGElement>) {
  const width = Math.round((size * 240) / 200);
  const a11y = decorative
    ? { "aria-hidden": true as const }
    : { role: "img" as const, "aria-label": "Chayamukhi" };
  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 240 200"
      fill="none"
      className={className}
      {...a11y}
      {...rest}
    >
      <g stroke="currentColor" strokeWidth={15} strokeLinecap="round" strokeLinejoin="miter">
        {/* C — ring with an opening on the right */}
        <path d="M 150 46 A 74 74 0 1 0 150 154" />
        {/* M — left leg, centre valley, right leg */}
        <path d="M 108 150 L 108 56 L 150 112 L 192 56 L 192 150" />
      </g>
    </svg>
  );
}

/**
 * Brand wordmark: the golden monogram followed by "Chayamukhi" in a running script.
 * Logo sits to the LEFT of the text. Both inherit the gold colour.
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
    <span className={`inline-flex items-center text-gold ${gap} ${className}`}>
      <LogoMark size={markSize} decorative className="shrink-0" />
      <span className={`font-script leading-none ${textClassName}`}>Chayamukhi</span>
    </span>
  );
}
