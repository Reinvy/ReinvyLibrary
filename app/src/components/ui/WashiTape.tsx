import { cn } from "@/lib/utils";

interface WashiTapeProps {
  className?: string;
}

/** Translucent cream "washi tape" strip, slightly rotated, at the top of a card. */
export default function WashiTape({ className }: WashiTapeProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-1/2 top-0 h-5 w-24 -translate-x-1/2 -translate-y-1/2 rotate-[-2deg] rounded-sm bg-washi shadow-paper",
        className
      )}
    />
  );
}
