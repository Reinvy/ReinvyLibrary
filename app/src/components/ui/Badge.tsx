import { cn } from "@/lib/utils";

type BadgeTone = "peach" | "sage" | "sticky" | "eucalyptus";

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  className?: string;
  children?: React.ReactNode;
}

/** Small solid badge for type/difficulty/language markers. */
export default function Badge({ label, tone = "peach", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone === "peach" && "bg-peach text-ink",
        tone === "sage" && "bg-sage text-ink",
        tone === "sticky" && "bg-sticky text-ink",
        tone === "eucalyptus" && "bg-eucalyptus/20 text-eucalyptus",
        className
      )}
    >
      {label}
      {children}
    </span>
  );
}
