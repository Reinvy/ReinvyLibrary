import { slugify } from "@/lib/utils";
import type { ReactNode } from "react";

interface SectionHeadingProps {
  children: ReactNode;
}

/** H2 section heading with a hoverable anchor link. */
export default function SectionHeading({ children }: SectionHeadingProps) {
  const text = typeof children === "string" ? children : String(children);
  const id = slugify(text);
  return (
    <h2
      id={id}
      className="group mb-4 mt-10 flex scroll-mt-24 items-baseline gap-2 font-display text-2xl font-bold text-ink"
    >
      <span>{children}</span>
      <a
        href={`#${id}`}
        className="text-terracotta opacity-0 transition-opacity group-hover:opacity-100"
        aria-label={`Link to section: ${text}`}
      >
        #
      </a>
    </h2>
  );
}
