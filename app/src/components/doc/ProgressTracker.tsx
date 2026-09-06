"use client";

import { useEffect } from "react";
import { useProgress } from "@/components/providers/ProgressProvider";
import { useGamification } from "@/components/providers/GamificationProvider";
import type { ChecklistItem } from "@/lib/types";

interface ProgressTrackerProps {
  topicSlug: string;
  items: ChecklistItem[];
  /** localized label, e.g. "progress" */
  progressLabel: string;
  /** localized "of" */
  ofLabel: string;
}

/** Syllabus chapter progress card (reads localStorage). */
export default function ProgressTracker({
  topicSlug,
  items,
  progressLabel,
  ofLabel,
}: ProgressTrackerProps) {
  const { progress } = useProgress();
  const { recordSyllabusProgress } = useGamification();
  const done = (progress[topicSlug]?.checked ?? []).filter((id) =>
    items.some((i) => i.id === id)
  ).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  // Graduate bonus: completing every chapter grants a one-time XP reward.
  useEffect(() => {
    if (items.length > 0 && done === items.length) {
      recordSyllabusProgress(topicSlug, done, items.length);
    }
  }, [done, items.length, topicSlug, recordSyllabusProgress]);

  return (
    <div className="sticky-note my-4 rounded-2xl border border-sticky/70 bg-sticky p-4 shadow-paper">
      <div className="flex items-center justify-between">
        <p className="font-hand text-sm text-ink">
          {progressLabel}: {done} {ofLabel} {items.length}
        </p>
        <span className="font-display text-sm font-bold text-terracotta">{pct}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-card/70">
        <div
          className="h-full rounded-full bg-eucalyptus transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
