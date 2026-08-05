import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type CalloutVariant = "tip" | "warning";

interface StickyCalloutProps {
  variant?: CalloutVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

const TITLES = {
  tip: "a little note",
  warning: "mind the washi!",
} as const;

const STYLES: Record<CalloutVariant, { box: string; heading: string }> = {
  tip: {
    box: "bg-sticky border-sticky/60",
    heading: "text-ink",
  },
  warning: {
    box: "bg-peach border-peach/60",
    heading: "text-terracotta",
  },
};

/** Sticky-note callout: lemon tip or peach warning, Kalam header, micro-rotation, washi tape. */
export default function StickyCallout({
  variant = "tip",
  title,
  children,
  className,
}: StickyCalloutProps) {
  const style = STYLES[variant];
  return (
    <aside
      className={cn(
        "relative my-6 rounded-2xl border p-5 pl-6 shadow-paper rotate-[-0.5deg]",
        style.box,
        className
      )}
    >
      {/* washi tape strip */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-4 w-20 -translate-x-1/2 -translate-y-1/2 rotate-[1.5deg] rounded-sm bg-washi shadow-paper"
      />
      <p className={cn("font-hand text-base", style.heading)}>
        {title ?? TITLES[variant]}
      </p>
      <div className="mt-1 text-ink-muted">{children}</div>
    </aside>
  );
}
