"use client";

import Link from "next/link";
import { useProgress } from "@/components/providers/ProgressProvider";
import type { Locale, Topic } from "@/lib/types";
import { TYPE_DIR } from "@/lib/constants";
import { topicUrl } from "@/lib/urls";

interface SyllabusProgressCardProps {
  syllabi: Topic[];
  locale: Locale;
  emptyLabel: string;
  ctaLabel: string;
}

/** Sticky-note card summarizing localStorage syllabus progress. */
export default function SyllabusProgressCard({
  syllabi,
  locale,
  emptyLabel,
  ctaLabel,
}: SyllabusProgressCardProps) {
  const { checkedCount } = useProgress();
  const started = syllabi.filter((s) => checkedCount(s.slug) > 0);

  return (
    <div className="sticky-note rounded-2xl border border-sticky/70 bg-sticky p-6 shadow-paper">
      <div className="washi" aria-hidden />
      <p className="font-hand text-lg text-ink">📌 {ctaLabel}</p>
      {started.length === 0 ? (
        <p className="mt-2 font-hand text-sm text-ink-muted">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {started.slice(0, 3).map((s) => {
            const done = checkedCount(s.slug);
            return (
              <li key={s.slug}>
                <Link
                  href={topicUrl(locale, s.category, s.technology, TYPE_DIR[s.type], s.slug)}
                  className="flex items-center justify-between gap-2 rounded-xl bg-card/70 px-3 py-2 font-hand text-sm text-ink transition hover:bg-card"
                >
                  <span className="line-clamp-1">{s.title}</span>
                  <span className="shrink-0 rounded-full bg-eucalyptus/20 px-2 py-0.5 text-xs text-eucalyptus">
                    {done}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
