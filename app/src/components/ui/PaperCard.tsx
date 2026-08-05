import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PaperCardProps {
  children: ReactNode;
  className?: string;
  /** micro-rotation (default: none) */
  rotate?: boolean;
  as?: "div" | "article" | "li" | "section";
}

/** The base paper card: white, rounded, soft paper shadow, warm border. */
export default function PaperCard({
  children,
  className,
  rotate = false,
  as = "div",
}: PaperCardProps) {
  const Tag = as;
  return (
    <Tag
      className={cn(
        "relative rounded-card border border-line bg-card shadow-paper transition-shadow",
        rotate && "hover:rotate-0 hover:shadow-lift",
        className
      )}
    >
      {children}
    </Tag>
  );
}
