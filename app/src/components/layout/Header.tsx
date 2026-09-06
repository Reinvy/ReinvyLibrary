import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import { GITHUB_REPO } from "@/lib/github";
import type { Locale } from "@/lib/types";
import AppIcon from "@/components/ui/AppIcon";
import HeaderGamification from "@/components/gamification/HeaderGamification";
import NavLinks from "./NavLinks";

export default function Header({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href={`/${locale}`} className="group flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-2xl shadow-paper transition group-hover:rotate-[-3deg]">
            <AppIcon size={36} />
          </span>
          <span className="font-display text-lg font-bold text-ink">
            Reinvy<span className="text-terracotta">Library</span>
          </span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <NavLinks
            locale={locale}
            labels={{ home: dict.nav.home, categories: dict.nav.categories, search: dict.nav.search }}
          />
          <HeaderGamification
            locale={locale}
            levelLabel={dict.game.level}
            xpLabel={dict.game.xp}
            toGoLabel={dict.game.toGo}
            streakLabel={dict.game.streak}
            freezeLabel={dict.game.freezes}
          />
          <a
            href={`https://github.com/${GITHUB_REPO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full border border-line bg-card px-3 py-1.5 font-hand text-sm text-ink-muted transition hover:bg-sage hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60 sm:inline-block"
          >
            {dict.nav.source}
          </a>
        </nav>
      </div>
    </header>
  );
}
