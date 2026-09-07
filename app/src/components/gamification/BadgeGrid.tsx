"use client";

import {
  Bookmark,
  Compass,
  Crown,
  Flame,
  Footprints,
  GraduationCap,
  Languages,
  Glasses,
  Scissors,
  Scroll,
  Stamp,
  Lock,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useGamification } from "@/components/providers/GamificationProvider";
import { BADGES, BADGE_XP_BONUS } from "@/lib/gamification/xp-engine";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  footprints: Footprints,
  bookmark: Bookmark,
  scissors: Scissors,
  languages: Languages,
  glasses: Glasses,
  compass: Compass,
  stamp: Stamp,
  scroll: Scroll,
  flame: Flame,
  zap: Zap,
  graduation: GraduationCap,
  crown: Crown,
};

const RARITY_STYLES: Record<string, string> = {
  common: "border-line bg-card",
  uncommon: "border-eucalyptus/50 bg-sage/50",
  rare: "border-terracotta/40 bg-peach/50",
  epic: "border-terracotta/60 bg-peach",
  legendary: "border-terracotta bg-sticky",
};

interface BadgeGridProps {
  locale: Locale;
  title: string;
  unlockedLabel: string;
  lockedLabel: string;
  compact?: boolean;
}

/** Sticker-style badge shelf. Locked badges show a lock + hint. */
export default function BadgeGrid({ locale, title, unlockedLabel, lockedLabel, compact }: BadgeGridProps) {
  const { state, ready } = useGamification();
  const unlockedCount = Object.keys(state.badges).length;
  const list = compact ? BADGES.slice(0, 6) : BADGES;

  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
        <p className="font-hand text-xs text-ink-muted">
          {ready ? unlockedCount : "–"}/{BADGES.length} {unlockedLabel}
        </p>
      </div>
      <ul className={cn("grid gap-3", compact ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}>
        {list.map((b) => {
          const unlockedAt = ready ? state.badges[b.id] : undefined;
          const Icon = ICONS[b.icon] ?? Stamp;
          return (
            <li
              key={b.id}
              title={locale === "en" ? b.descEn : b.descId}
              className={cn(
                "relative rounded-2xl border p-3 text-center shadow-paper transition",
                unlockedAt ? RARITY_STYLES[b.rarity] : "border-line bg-card/60 opacity-70"
              )}
            >
              <span
                className={cn(
                  "mx-auto grid h-11 w-11 place-items-center rounded-full border shadow-paper",
                  unlockedAt ? "border-line bg-card text-terracotta" : "border-line bg-paper text-ink-muted"
                )}
              >
                {unlockedAt ? <Icon className="h-5 w-5" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
              </span>
              <p className="mt-2 line-clamp-1 font-display text-xs font-bold text-ink">
                {locale === "en" ? b.nameEn : b.nameId}
              </p>
              <p className="mt-0.5 line-clamp-2 font-hand text-[11px] leading-tight text-ink-muted">
                {unlockedAt ? (locale === "en" ? b.descEn : b.descId) : lockedLabel}
              </p>
              {unlockedAt && (
                <span className="mt-1 inline-block rounded-full bg-eucalyptus/20 px-2 py-px font-hand text-[10px] text-eucalyptus">
                  +{BADGE_XP_BONUS[b.rarity]} XP
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
