import { cn } from "@/lib/utils";

export type OwiMood = "happy" | "sleepy" | "sad" | "celebrate";

interface OwiMascotProps {
  mood?: OwiMood;
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Owi — the paper owl mascot. Pure inline SVG (no emoji), drawn with the
 * scrapbook palette via currentColor + token fills.
 */
export default function OwiMascot({ mood = "happy", size = 48, className, title = "Owi the paper owl" }: OwiMascotProps) {
  const eyesOpen = mood !== "sleepy";
  const mouth: Record<OwiMood, string> = {
    happy: "M38 52 Q46 58 54 52",
    celebrate: "M36 51 Q46 62 56 51",
    sad: "M38 57 Q46 51 54 57",
    sleepy: "M40 55 Q46 57 52 55",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 92 92"
      role="img"
      aria-label={title}
      className={cn("owi-blink shrink-0", className)}
    >
      {/* ear tufts */}
      <path d="M22 26 L16 10 L34 20 Z" className="fill-terracotta" />
      <path d="M70 26 L76 10 L58 20 Z" className="fill-terracotta" />
      {/* body */}
      <ellipse cx="46" cy="52" rx="30" ry="32" className="fill-washi stroke-line" strokeWidth="2" />
      {/* belly patch */}
      <ellipse cx="46" cy="60" rx="17" ry="18" className="fill-card stroke-line" strokeWidth="1.5" />
      {/* belly stitches */}
      <path d="M39 54 l5 4 M46 56 l5 4 M42 63 l5 4" className="stroke-line" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* wings */}
      <ellipse cx="19" cy="54" rx="7" ry="14" className="fill-peach stroke-line" strokeWidth="1.5" transform={mood === "celebrate" ? "rotate(-24 19 54)" : undefined} />
      <ellipse cx="73" cy="54" rx="7" ry="14" className="fill-peach stroke-line" strokeWidth="1.5" transform={mood === "celebrate" ? "rotate(24 73 54)" : undefined} />
      {/* eyes */}
      {eyesOpen ? (
        <>
          <circle cx="36" cy="42" r="8" className="fill-card stroke-line" strokeWidth="1.5" />
          <circle cx="56" cy="42" r="8" className="fill-card stroke-line" strokeWidth="1.5" />
          <circle cx={mood === "sad" ? 36 : 37.5} cy={mood === "sad" ? 44 : 43} r="3.2" className="fill-ink" />
          <circle cx={mood === "sad" ? 56 : 57.5} cy={mood === "sad" ? 44 : 43} r="3.2" className="fill-ink" />
          <circle cx="38.5" cy="41.8" r="1" className="fill-card" />
          <circle cx="58.5" cy="41.8" r="1" className="fill-card" />
        </>
      ) : (
        <>
          <path d="M29 42 Q36 46 43 42" className="stroke-ink" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M49 42 Q56 46 63 42" className="stroke-ink" strokeWidth="2" strokeLinecap="round" fill="none" />
        </>
      )}
      {/* blush */}
      <ellipse cx="28" cy="50" rx="3.5" ry="2.2" className="fill-peach" opacity="0.9" />
      <ellipse cx="64" cy="50" rx="3.5" ry="2.2" className="fill-peach" opacity="0.9" />
      {/* beak */}
      <path d="M42 47 L50 47 L46 52 Z" className="fill-terracotta" />
      {/* mouth */}
      <path d={mouth[mood]} className="stroke-ink" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* party hat when celebrating */}
      {mood === "celebrate" && (
        <>
          <path d="M46 22 L36 4 L58 10 Z" className="fill-eucalyptus stroke-line" strokeWidth="1.5" />
          <circle cx="36" cy="4" r="3" className="fill-terracotta" />
        </>
      )}
      {/* nightcap when sleepy */}
      {mood === "sleepy" && (
        <>
          <path d="M30 22 Q46 6 64 20 L60 26 Q46 14 34 27 Z" className="fill-sage stroke-line" strokeWidth="1.5" />
          <circle cx="64" cy="20" r="3.5" className="fill-card stroke-line" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}
