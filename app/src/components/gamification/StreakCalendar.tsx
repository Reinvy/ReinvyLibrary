"use client";

import { useGamification } from "@/components/providers/GamificationProvider";
import { todayKey, diffDays } from "@/lib/gamification/storage";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";
import OwiMascot from "./OwiMascot";

interface StreakCalendarProps {
  locale: Locale;
  title: string;
  bestLabel: string;
  emptyLabel: string;
  ctaLabel: string;
  browseHref: string;
}

const DAY_LETTERS: Record<string, string[]> = {
  en: ["M", "T", "W", "T", "F", "S", "S"],
  id: ["S", "S", "R", "K", "J", "S", "M"],
};

/**
 * Last-7-days strip derived honestly from {streak, lastVisit}: the N most
 * recent days ending today are lit when the streak is alive.
 */
export default function StreakCalendar({ locale, title, bestLabel, emptyLabel, ctaLabel, browseHref }: StreakCalendarProps) {
  const { state, ready } = useGamification();

  const days: boolean[] = (() => {
    if (!ready || state.streak === 0 || !state.lastVisit) return Array(7).fill(false);
    const gap = diffDays(state.lastVisit, todayKey());
    if (gap > 1) return Array(7).fill(false);
    // Streak alive: light the last min(streak,7) cells (shift by gap when yesterday).
    const lit = Math.min(state.streak, 7);
    return Array.from({ length: 7 }, (_, i) => i >= 7 - lit - gap && i < 7 - gap);
  })();

  const alive = days.some(Boolean);

  return (
    <div className="relative h-full rounded-2xl border border-line bg-card p-6 shadow-paper">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-hand text-lg text-ink">{title}</p>
          <p className="font-hand text-xs text-ink-muted">
            {ready ? `${state.streak} · ${bestLabel} ${state.longestStreak}` : "…"}
          </p>
        </div>
        <OwiMascot mood={!ready || alive ? "happy" : "sleepy"} size={40} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-1.5" role="img" aria-label={`${state.streak} day streak`}>
        {days.map((lit, i) => (
          <span key={i} className="flex flex-1 flex-col items-center gap-1">
            <span
              className={cn(
                "grid h-9 w-full place-items-center rounded-xl border text-sm transition",
                lit ? "border-terracotta/40 bg-terracotta/10" : "border-line bg-paper"
              )}
            >
            <span aria-hidden>
                {lit ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-terracotta" fill="currentColor">
                    <path d="M12 2c1 4-4 6-4 11a4.5 4.5 0 0 0 9 .5C17.5 9 13 8 12 2Zm-1.5 17.5A2.5 2.5 0 0 1 8 17c0-1.5 1.2-2.3 2.3-3.2.4 1 .9 1.7 1.7 2.2-.2.9-.2 1.2-.5 1.5Z" />
                  </svg>
                ) : (
                  <span className="text-ink-muted/40">·</span>
                )}
              </span>
            </span>
            <span className="font-hand text-[10px] text-ink-muted">{DAY_LETTERS[locale][i]}</span>
          </span>
        ))}
      </div>
      {!ready ? null : !alive ? (
        <a
          href={browseHref}
          className="mt-3 inline-block rounded-full bg-terracotta px-4 py-2 font-hand text-sm text-card shadow-paper transition hover:-rotate-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
        >
          {emptyLabel} · {ctaLabel} →
        </a>
      ) : null}
    </div>
  );
}
