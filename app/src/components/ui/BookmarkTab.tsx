import Link from "next/link";
import { cn } from "@/lib/utils";

interface BookmarkTabProps {
  label: string;
  active?: boolean;
  rotate?: boolean;
  href?: string;
  onClick?: () => void;
}

/** Physical index-bookmark tab hooked to the reader edge. */
export default function BookmarkTab({
  label,
  active = false,
  rotate = false,
  href,
  onClick,
}: BookmarkTabProps) {
  const className = cn(
    "block w-full rounded-r-xl border-l-2 py-2 pl-3 pr-2 text-left font-display text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60",
    active
      ? "border-terracotta bg-peach text-ink shadow-paper"
      : "border-line bg-card text-ink-muted hover:bg-peach/50 hover:text-ink",
    rotate && "hover:rotate-[0.5deg]"
  );

  if (href) {
    return (
      <Link href={href} aria-current={active ? "page" : undefined} className={className}>
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={className}>
      {label}
    </button>
  );
}
