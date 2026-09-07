"use client";

import { useEffect } from "react";
import { useGamification } from "@/components/providers/GamificationProvider";
import { BADGES, DAILY_QUESTS } from "@/lib/gamification/xp-engine";
import { levelTitle } from "@/lib/gamification/xp-engine";
import type { Locale } from "@/lib/types";
import OwiMascot from "./OwiMascot";

interface AchievementToastProps {
  locale: Locale;
  labels: {
    badgeUnlocked: string;
    levelUp: string;
    questDone: string;
    freezeUsed: string;
    syllabusDone: string;
    xpSuffix: string;
  };
}

/**
 * Stacked celebration toasts (sticky-note style) for badge / level / quest
 * events. Paper-piece burst is pure CSS — no extra dependency, and it
 * respects prefers-reduced-motion via the .confetti-burst animation guard.
 */
export default function AchievementToast({ locale, labels }: AchievementToastProps) {
  const { toasts, dismissToast } = useGamification();

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      window.setTimeout(() => dismissToast(t.id), 5200)
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [toasts, dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-5 right-4 z-50 flex w-72 flex-col gap-2 sm:right-6">
      {toasts.map((t) => {
        const badge = t.badgeId ? BADGES.find((b) => b.id === t.badgeId) : undefined;
        const quest = t.kind === "quest" ? true : false;
        const title =
          t.kind === "badge" && badge
            ? `${labels.badgeUnlocked}: ${locale === "en" ? badge.nameEn : badge.nameId}`
            : t.kind === "level" && t.level
              ? `${labels.levelUp} ${t.level} · ${levelTitle(t.level, locale)}`
              : t.kind === "freeze"
                ? labels.freezeUsed
                : t.kind === "syllabus"
                  ? labels.syllabusDone
                  : quest
                    ? labels.questDone
                    : "";
        return (
          <div
            key={t.id}
            className="toast-pop pointer-events-auto relative overflow-hidden rounded-2xl border border-sticky/70 bg-sticky p-3 pr-8 shadow-lift"
            role="status"
          >
            <span aria-hidden className="confetti-burst">
              {["bg-terracotta", "bg-eucalyptus", "bg-peach", "bg-sage", "bg-card", "bg-terracotta/70"].map((c, i) => (
                <i key={i} className={c} />
              ))}
            </span>
            <div className="flex items-center gap-2">
              <OwiMascot mood="celebrate" size={36} />
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold text-ink">{title}</p>
                {typeof t.xp === "number" && t.xp > 0 && (
                  <p className="font-hand text-xs text-ink-muted">
                    +{t.xp} {labels.xpSuffix}
                  </p>
                )}
                {t.kind === "quest" && (
                  <p className="truncate font-hand text-xs text-ink-muted">
                    {DAILY_QUESTS.map((q) => (locale === "en" ? q.titleEn : q.titleId)).slice(0, 1)} ✓
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss"
              className="absolute right-2 top-2 rounded-full px-1.5 font-hand text-sm text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
