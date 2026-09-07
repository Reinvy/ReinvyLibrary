"use client";

import Link from "next/link";
import { useGamification } from "@/components/providers/GamificationProvider";
import type { Locale } from "@/lib/types";
import OwiMascot from "./OwiMascot";

interface ContinueLearningCardProps {
  locale: Locale;
  title: string;
  continueLabel: string;
  shelfLabel: string;
  emptyHistory: string;
  emptyBookmarks: string;
  browseLabel: string;
  removeLabel: string;
  browseHref: string;
}

/** "Rak bacaku": resume in-progress reads + saved bookmarks. */
export default function ContinueLearningCard({
  locale,
  title,
  continueLabel,
  shelfLabel,
  emptyHistory,
  emptyBookmarks,
  browseLabel,
  removeLabel,
  browseHref,
}: ContinueLearningCardProps) {
  const { state, ready, toggleBookmark } = useGamification();
  void locale;

  if (!ready) {
    return (
      <div className="rounded-2xl border border-line bg-card p-6 shadow-paper" aria-hidden>
        <div className="h-5 w-32 animate-pulse rounded-full bg-line/70" />
        <div className="mt-3 space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-xl bg-paper" />
          ))}
        </div>
      </div>
    );
  }

  const inProgress = state.history.filter((h) => h.progress < 100).slice(0, 3);
  const finished = state.history.filter((h) => h.progress >= 100).slice(0, 2);
  const history = [...inProgress, ...finished].slice(0, 4);

  return (
    <div className="relative h-full rounded-2xl border border-line bg-card p-6 shadow-paper">
      <div className="flex items-start justify-between gap-2">
        <p className="font-hand text-lg text-ink">{title}</p>
        <OwiMascot mood={history.length > 0 || state.bookmarks.length > 0 ? "happy" : "sleepy"} size={40} />
      </div>

      <p className="mt-3 font-display text-xs font-bold uppercase tracking-wide text-ink-muted">{continueLabel}</p>
      {history.length === 0 ? (
        <p className="mt-1 font-hand text-sm text-ink-muted">{emptyHistory}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {history.map((h) => (
            <li key={h.key}>
              <Link
                href={h.url}
                className="block rounded-xl bg-paper px-3 py-2 transition hover:bg-sage/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
              >
                <span className="line-clamp-1 font-hand text-sm text-ink">{h.title}</span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-line/60" aria-hidden>
                  <span className="block h-full rounded-full bg-eucalyptus" style={{ width: `${h.progress}%` }} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 font-display text-xs font-bold uppercase tracking-wide text-ink-muted">{shelfLabel}</p>
      {state.bookmarks.length === 0 ? (
        <p className="mt-1 font-hand text-sm text-ink-muted">{emptyBookmarks}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {state.bookmarks.slice(0, 4).map((b) => (
            <li key={b.key} className="flex items-center gap-2 rounded-xl bg-peach/40 px-3 py-2">
              <Link href={b.url} className="line-clamp-1 flex-1 font-hand text-sm text-ink hover:text-terracotta">
                {b.title}
              </Link>
              <button
                type="button"
                onClick={() => toggleBookmark(b)}
                aria-label={`${removeLabel}: ${b.title}`}
                className="rounded-full px-1.5 font-hand text-sm text-ink-muted hover:text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={browseHref}
        className="mt-4 inline-block rounded-full bg-card px-4 py-2 font-hand text-sm text-ink shadow-paper transition hover:-rotate-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
      >
        {browseLabel} →
      </Link>
    </div>
  );
}
