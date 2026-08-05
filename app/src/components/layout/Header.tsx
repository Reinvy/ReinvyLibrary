import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import { GITHUB_REPO } from "@/lib/github";
import type { Locale } from "@/lib/types";

export default function Header({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href={`/${locale}`} className="group flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-sticky font-display text-lg font-bold text-ink shadow-paper transition group-hover:rotate-[-3deg]">
            R
          </span>
          <span className="font-display text-lg font-bold text-ink">
            Reinvy<span className="text-terracotta">Library</span>
          </span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <Link
            href={`/${locale}`}
            className="rounded-full px-3 py-1.5 font-hand text-sm text-ink-muted transition hover:bg-peach hover:text-ink"
          >
            {dict.nav.home}
          </Link>
          <Link
            href={`/${locale}#categories`}
            className="rounded-full px-3 py-1.5 font-hand text-sm text-ink-muted transition hover:bg-peach hover:text-ink"
          >
            {dict.nav.categories}
          </Link>
          <Link
            href={`/${locale}/search`}
            className="rounded-full px-3 py-1.5 font-hand text-sm text-ink-muted transition hover:bg-peach hover:text-ink"
          >
            {dict.nav.search}
          </Link>
          <a
            href={`https://github.com/${GITHUB_REPO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full border border-line bg-card px-3 py-1.5 font-hand text-sm text-ink-muted transition hover:bg-sage hover:text-ink sm:inline-block"
          >
            {dict.nav.source}
          </a>
        </nav>
      </div>
    </header>
  );
}
