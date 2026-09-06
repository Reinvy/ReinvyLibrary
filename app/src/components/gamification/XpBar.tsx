"use client";

import { useGamification } from "@/components/providers/GamificationProvider";
import { levelTitle, progressToNextLevel } from "@/lib/gamification/xp-engine";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

interface XpBarProps {
  locale: Locale;
  levelLabel: string;
  xpLabel: string;
  toGoLabel: string;
  compact?: boolean;
  className?: string;
}

/** Level pill + XP progress bar. Renders a skeleton until the store hydrates. */
export default function XpBar({ locale, levelLabel, xpLabel, toGoLabel, compact, className }: XpBarProps) {
  const { state, ready } = useGamification();
  if (!ready) {
    return (
      <div aria-hidden className={cn("flex items-center gap-2", className)}>
        <div className="h-6 w-14 animate-pulse rounded-full bg-line/70" />
        {!compact && <div className="h-2 w-24 animate-pulse rounded-full bg-line/70" />}
      </div>
    );
  }
  const { level, pct, remaining } = progressToNextLevel(state.totalXp);
  return (
    <div
      className={cn("flex items-center gap-2", className)}
      title={`${levelLabel} ${level} · ${state.totalXp} ${xpLabel} · ${remaining} ${toGoLabel}`}
    >
      <span className="inline-flex items-center gap-1 rounded-full bg-peach px-2.5 py-1 font-display text-xs font-bold text-ink shadow-paper">
        <span aria-hidden>✦</span>
        <span>
          {levelLabel} {level}
        </span>
      </span>
      {!compact && (
        <span className="hidden flex-col gap-0.5 sm:flex" aria-hidden={false}>
          <span className="font-hand text-[11px] leading-none text-ink-muted">
            {levelTitle(level, locale)} · {state.totalXp} {xpLabel}
          </span>
          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-line/70" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${state.totalXp} ${xpLabel}`}>
            <span className="block h-full rounded-full bg-eucalyptus transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </span>
        </span>
      )}
    </div>
  );
}
