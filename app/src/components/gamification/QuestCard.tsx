"use client";

import Link from "next/link";
import { useGamification } from "@/components/providers/GamificationProvider";
import { DAILY_QUESTS } from "@/lib/gamification/xp-engine";
import type { Locale } from "@/lib/types";
import OwiMascot from "./OwiMascot";

interface QuestCardProps {
  locale: Locale;
  title: string;
  doneLabel: string;
  bonusLabel: string;
  completeLabel: string;
  browseHref: string;
}

/** Sticky-note card with today's 3 quests + progress. Empty-safe when store loads. */
export default function QuestCard({ locale, title, doneLabel, bonusLabel, completeLabel, browseHref }: QuestCardProps) {
  const { state, ready } = useGamification();
  const quests = ready ? state.quests.daily : [];
  const allDone = quests.length > 0 && quests.every((q) => q.done);

  return (
    <div className="sticky-note relative h-full rounded-2xl border border-sticky/70 bg-sticky p-6 shadow-paper">
      <div className="washi" aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <p className="font-hand text-lg text-ink">{title}</p>
        <OwiMascot mood={allDone ? "celebrate" : "happy"} size={40} />
      </div>
      {!ready ? (
        <div className="mt-3 space-y-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-xl bg-card/70" />
          ))}
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {DAILY_QUESTS.map((def) => {
            const q = quests.find((x) => x.id === def.id);
            const done = q?.done ?? false;
            const progress = q?.progress ?? 0;
            return (
              <li
                key={def.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-card/70 px-3 py-2 font-hand text-sm text-ink"
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`grid h-5 w-5 place-items-center rounded-full border text-[11px] ${
                      done ? "border-eucalyptus bg-eucalyptus text-card" : "border-line bg-card text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className={done ? "line-through opacity-60" : undefined}>
                    {locale === "en" ? def.titleEn : def.titleId}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-ink-muted">
                  {progress}/{def.target}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 font-hand text-xs text-ink-muted">
        {allDone ? (
          <span className="font-bold text-eucalyptus">✓ {completeLabel}</span>
        ) : (
          <>
            {doneLabel} · <span className="font-bold text-terracotta">+{30} {bonusLabel}</span>
          </>
        )}{" "}
        <Link href={browseHref} className="underline underline-offset-2 hover:text-terracotta">
          →
        </Link>
      </p>
    </div>
  );
}
