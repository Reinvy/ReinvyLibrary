interface AppIconProps {
  size?: number;
  variant?: "full" | "simple";
  className?: string;
  title?: string;
}

/**
 * ReinvyLibrary — Scrapbook R app icon.
 *
 * Playful flat mark that evolves the current Header "R" badge:
 * paper base, white scrapbook card (tilted -4deg), washi tape,
 * eucalyptus bookmark, sticky-note corner, ink R + terracotta dot.
 *
 * Colors are the design-system tokens from src/app/globals.css —
 * no pure black, rounded shapes, soft scrapbook feel.
 *
 * `simple` hides the small decorations so the mark stays legible
 * at 16–32px (favicon / tab bar).
 */
export default function AppIcon({
  size = 36,
  variant = "full",
  className,
  title = "ReinvyLibrary",
}: AppIconProps) {
  const simple = variant === "simple";
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
    >
      {title ? <title>{title}</title> : null}
      {/* base — paper, full-bleed rounded square */}
      <rect
        x="4"
        y="4"
        width="504"
        height="504"
        rx="112"
        fill="#FAFAF7"
        stroke="#E5E5E0"
        strokeWidth="8"
      />
      {/* scrapbook card, tilted like a sticky note */}
      <g transform="rotate(-4 256 272)">
        <rect
          x="96"
          y="122"
          width="320"
          height="282"
          rx="48"
          fill="#FFFFFF"
          stroke="#E5E5E0"
          strokeWidth="8"
        />
        {/* eucalyptus bookmark ribbon */}
        {!simple && (
          <path
            d="M132 122 v92 l22 -16 l22 16 v-92 z"
            fill="#81B29A"
            stroke="#E5E5E0"
            strokeWidth="5"
            strokeLinejoin="round"
          />
        )}
        {/* letter R — pure vector (no font dependency, crisp at 16–512px) */}
        <g fill="none" stroke="#2D3142" strokeLinecap="round" strokeLinejoin="round">
          <line x1="196" y1="196" x2="196" y2="356" strokeWidth="42" />
          <path
            d="M196 202 H272 A48 48 0 0 1 272 298 H196"
            strokeWidth="38"
          />
          <line x1="258" y1="292" x2="330" y2="358" strokeWidth="40" />
        </g>
        {/* terracotta dot accent */}
        <circle
          cx="338"
          cy="296"
          r="21"
          fill="#E07A5F"
          stroke="#FFFFFF"
          strokeWidth="7"
        />
        {/* sage underline — table-header hint */}
        {!simple && (
          <rect
            x="172"
            y="362"
            width="118"
            height="15"
            rx="7.5"
            fill="#E8F3E8"
          />
        )}
      </g>
      {/* washi tape across the top of the card */}
      {!simple && (
        <g transform="rotate(-2 256 118)">
          <rect
            x="176"
            y="96"
            width="160"
            height="42"
            rx="9"
            fill="#F7F3E8"
            stroke="#E5E5E0"
            strokeWidth="5"
          />
          <line
            x1="196"
            y1="106"
            x2="196"
            y2="128"
            stroke="#E5E5E0"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="2 8"
          />
          <line
            x1="316"
            y1="106"
            x2="316"
            y2="128"
            stroke="#E5E5E0"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="2 8"
          />
        </g>
      )}
      {/* sticky-note corner */}
      {!simple && (
        <g transform="rotate(8 366 348)">
          <rect
            x="318"
            y="300"
            width="96"
            height="96"
            rx="20"
            fill="#FFF3B0"
            stroke="#E5E5E0"
            strokeWidth="6"
          />
          <line
            x1="334"
            y1="330"
            x2="398"
            y2="330"
            stroke="#4C566A"
            strokeWidth="7"
            strokeLinecap="round"
            opacity="0.45"
          />
          <line
            x1="334"
            y1="352"
            x2="378"
            y2="352"
            stroke="#4C566A"
            strokeWidth="7"
            strokeLinecap="round"
            opacity="0.3"
          />
        </g>
      )}
    </svg>
  );
}
