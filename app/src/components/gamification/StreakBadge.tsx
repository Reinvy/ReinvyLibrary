"use client";

import { useGamification } from "@/components/providers/GamificationProvider";
import { cn } from "@/lib/utils";

interface StreakBadgeProps {
  streakLabel: string;
  freezeLabel: string;
  className?: string;
}

/** Flame pill with current streak + freeze count. Skeleton until hydrated. */
export default function StreakBadge({ streakLabel, freezeLabel, className }: StreakBadgeProps) {
  const { state, ready } = useGamification();
  if (!ready) {
    return <div aria-hidden className={cn("h-6 w-16 animate-pulse rounded-full bg-line/70", className)} />;
  }
  const hot = state.streak >= 3;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-display text-xs font-bold shadow-paper",
        hot ? "border-terracotta/40 bg-terracotta/10 text-terracotta" : "border-line bg-card text-ink-muted",
        className
      )}
      title={`${state.streak} ${streakLabel} · ${state.freezes} ${freezeLabel}`}
    >
      <svg aria-hidden viewBox="0 0 24 24" className={cn("h-3.5 w-3.5", hot ? "text-terracotta" : "text-ink-muted")} fill="currentColor">
        <path d="M12 2c1 4-4 6-4 11a4.5 4.5 0 0 0 9 .5C17.5 9 13 8 12 2Zm-1.5 17.5A2.5 2.5 0 0 1 8 17c0-1.5 1.2-2.3 2.3-3.2.4 1 .9 1.7 1.7 2.2-.2.9-.2 1.2-.5 1.5Z" />
      </svg>
      <span>{state.streak}</span>
      {state.freezes > 0 && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-sage px-1.5 py-px text-[10px] text-ink" aria-hidden={false}>
          ❄{state.freezes}
        </span>
      )}
    </span>
  );
}
