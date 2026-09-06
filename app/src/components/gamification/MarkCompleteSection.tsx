"use client";

import { useEffect, useRef, useState } from "react";
import { useGamification } from "@/components/providers/GamificationProvider";
import { xpForDoc } from "@/lib/gamification/xp-engine";
import type { Locale } from "@/lib/types";
import OwiMascot from "./OwiMascot";

interface MarkCompleteSectionProps {
  slug: string;
  locale: Locale;
  category: string;
  technology: string;
  readingMinutes: number;
  title: string;
  url: string;
  labels: {
    markComplete: string;
    completed: string;
    earns: string;
    xpSuffix: string;
    scrollHint: string;
  };
}

/**
 * End-of-article reward: scroll-depth tracker (90% = auto complete) plus an
 * explicit "Mark as finished" button. XP is granted once per slug+locale —
 * the provider is the source of truth, this is just the trigger.
 */
export default function MarkCompleteSection({
  slug,
  locale,
  category,
  technology,
  readingMinutes,
  title,
  url,
  labels,
}: MarkCompleteSectionProps) {
  const { state, ready, markDocComplete } = useGamification();
  const [justEarned, setJustEarned] = useState<number | null>(null);
  const autoFired = useRef(false);
  const key = `${slug}:${locale}`;
  const completed = ready && key in state.completedDocs;
  const xp = xpForDoc(readingMinutes);

  const complete = () => {
    const res = markDocComplete({ slug, locale, category, technology, readingMinutes, title, url });
    if (!res.already && res.xp > 0) setJustEarned(res.xp);
  };

  // Scroll-depth auto-complete at 90% (progress itself is tracked by DocHistoryTracker).
  useEffect(() => {
    if (!ready || completed || autoFired.current) return;
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) return;
      const pct = (window.scrollY / max) * 100;
      if (pct >= 90 && !autoFired.current) {
        autoFired.current = true;
        complete();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, completed, key]);

  return (
    <div className="mt-10 rounded-2xl border border-dashed border-terracotta/50 bg-washi/60 p-5 text-center shadow-paper">
      <div className="mx-auto w-fit">
        <OwiMascot mood={completed ? "celebrate" : "happy"} size={56} />
      </div>
      {completed ? (
        <p className="mt-2 font-hand text-base text-ink" role="status">
          ✓ {labels.completed}
        </p>
      ) : (
        <>
          <p className="mt-2 font-hand text-sm text-ink-muted">{labels.scrollHint}</p>
          <button
            type="button"
            onClick={complete}
            className="mt-3 rounded-full bg-terracotta px-6 py-2.5 font-display text-sm font-bold text-card shadow-paper transition hover:-rotate-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
          >
            {labels.markComplete} · +{xp} {labels.xpSuffix}
          </button>
          <p className="mt-1.5 font-hand text-xs text-ink-muted">{labels.earns}</p>
        </>
      )}
      {justEarned !== null && (
        <p className="animate-pop mt-2 font-display text-sm font-bold text-eucalyptus" role="status">
          +{justEarned} {labels.xpSuffix}!
        </p>
      )}
    </div>
  );
}
