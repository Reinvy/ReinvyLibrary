"use client";

import { useGamification } from "@/components/providers/GamificationProvider";
import { TECHNOLOGIES, TECHNOLOGY_LABELS } from "@/lib/constants";
import type { Locale, Technology } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StampBookProps {
  locale: Locale;
  title: string;
  collectedLabel: string;
  lockedLabel: string;
}

/** Passport-style technology stamp collection (one stamp per tech read). */
export default function StampBook({ locale, title, collectedLabel, lockedLabel }: StampBookProps) {
  const { state, ready } = useGamification();
  const collected = ready ? Object.keys(state.technologiesRead).length : 0;

  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
        <p className="font-hand text-xs text-ink-muted">
          {ready ? collected : "–"}/{TECHNOLOGIES.length} {collectedLabel}
        </p>
      </div>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {TECHNOLOGIES.map((tech: Technology, i) => {
          const count = ready ? (state.technologiesRead[tech] ?? 0) : 0;
          const has = count > 0;
          const label = TECHNOLOGY_LABELS[tech]?.[locale] ?? tech;
          return (
            <li
              key={tech}
              title={has ? `${label} · ${count}x` : `${label} · ${lockedLabel}`}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center shadow-paper",
                has ? "border-terracotta/30 bg-card" : "border-line bg-card/50 opacity-60"
              )}
            >
              <span
                className={cn(
                  "stamp grid h-14 w-14 place-items-center rounded-full border-2 border-dashed font-display text-sm font-bold",
                  has
                    ? "rotate-[-8deg] border-terracotta/70 bg-peach/60 text-terracotta"
                    : "border-line bg-paper text-ink-muted/50"
                )}
                style={has ? { transform: `rotate(${(i % 5) * 3 - 6}deg)` } : undefined}
                aria-hidden
              >
                {has ? label.slice(0, 2).toUpperCase() : "?"}
              </span>
              <span className="line-clamp-1 font-hand text-[11px] text-ink">{label}</span>
              <span className="font-hand text-[10px] text-ink-muted">{has ? `${count}x` : "·"}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
