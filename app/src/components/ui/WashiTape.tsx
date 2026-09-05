import { cn } from "@/lib/utils";

interface WashiTapeProps {
  className?: string;
}

/** Translucent cream "washi tape" strip, slightly rotated, at the top of a card. */
export default function WashiTape({ className }: WashiTapeProps) {
  return (
    <span
      aria-hidden
      className={cn("washi pointer-events-none", className)}
    />
  );
}
