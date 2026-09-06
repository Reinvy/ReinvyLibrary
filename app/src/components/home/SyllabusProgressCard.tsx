"use client";

import Link from "next/link";
import { useProgress } from "@/components/providers/ProgressProvider";
import type { Locale, Topic } from "@/lib/types";
import { TYPE_DIR } from "@/lib/constants";
import { topicUrl } from "@/lib/urls";

interface SyllabusProgressCardProps {
  syllabi: Topic[];
  locale: Locale;
  title: string;
  emptyLabel: string;
  ctaLabel: string;
}

/** Sticky-note card summarizing localStorage syllabus progress. */
export default function SyllabusProgressCard({
  syllabi,
  locale,
  title,
  emptyLabel,
  ctaLabel,
}: SyllabusProgressCardProps) {
  const { checkedCount } = useProgress();
  const started = syllabi.filter((s) => checkedCount(s.slug) > 0);

  return (
    <div className="sticky-note relative h-full rounded-2xl border border-sticky/70 bg-sticky p-6 shadow-paper">
      <div className="washi" aria-hidden />
      <p className="font-hand text-lg text-ink">{title}</p>
      {started.length === 0 ? (
        <div className="mt-2">
          <p className="font-hand text-sm text-ink-muted">{emptyLabel}</p>
          <Link
            href={`/${locale}/browse`}
            className="mt-3 inline-block rounded-full bg-card px-4 py-2 font-hand text-sm text-ink shadow-paper transition hover:-rotate-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
          >
            {ctaLabel} →
          </Link>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {started.slice(0, 3).map((s) => {
            const done = checkedCount(s.slug);
            return (
              <li key={s.slug}>
                <Link
                  href={topicUrl(locale, s.category, s.technology, TYPE_DIR[s.type], s.slug)}
                  className="flex items-center justify-between gap-2 rounded-xl bg-card/70 px-3 py-2 font-hand text-sm text-ink transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
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
