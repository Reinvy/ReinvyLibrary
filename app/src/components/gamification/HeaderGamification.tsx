"use client";

import XpBar from "./XpBar";
import StreakBadge from "./StreakBadge";
import type { Locale } from "@/lib/types";

interface HeaderGamificationProps {
  locale: Locale;
  levelLabel: string;
  xpLabel: string;
  toGoLabel: string;
  streakLabel: string;
  freezeLabel: string;
}

/** Compact XP + streak cluster for the site header (client island). */
export default function HeaderGamification(props: HeaderGamificationProps) {
  const { locale, levelLabel, xpLabel, toGoLabel, streakLabel, freezeLabel } = props;
  return (
    <span className="flex items-center gap-1.5 sm:gap-2">
      <StreakBadge streakLabel={streakLabel} freezeLabel={freezeLabel} />
      <XpBar locale={locale} levelLabel={levelLabel} xpLabel={xpLabel} toGoLabel={toGoLabel} compact />
    </span>
  );
}
