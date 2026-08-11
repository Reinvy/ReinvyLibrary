import { cn } from "@/lib/utils";

type Tone = "peach" | "sage" | "sticky";

interface TagChipProps {
  label: string;
  tone?: Tone;
  className?: string;
}

/** Small paper tag pill with a micro-rotation. */
export default function TagChip({ label, tone = "peach", className }: TagChipProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-3 py-1 font-hand text-xs text-ink shadow-paper",
        tone === "peach" && "bg-peach",
        tone === "sage" && "bg-sage",
        tone === "sticky" && "bg-sticky",
        className
      )}
    >
      {label}
    </span>
  );
}
