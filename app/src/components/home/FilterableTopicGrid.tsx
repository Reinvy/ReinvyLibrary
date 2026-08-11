"use client";

import { useState } from "react";
import type { ContentType, Difficulty, Locale, Topic } from "@/lib/types";
import { CONTENT_TYPES, DIFFICULTIES, TYPE_LABELS, DIFFICULTY_LABELS } from "@/lib/constants";
import TopicCard from "@/components/home/TopicCard";
import EmptyState from "@/components/ui/EmptyState";

interface FilterableTopicGridProps {
  topics: Topic[];
  locale: Locale;
  emptyTitle: string;
  emptyMessage: string;
}

/** Client-side filter grid (type × difficulty pills). */
export default function FilterableTopicGrid({
  topics,
  locale,
  emptyTitle,
  emptyMessage,
}: FilterableTopicGridProps) {
  const [type, setType] = useState<ContentType | "all">("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");

  const filtered = topics.filter(
    (t) =>
      (type === "all" || t.type === type) &&
      (difficulty === "all" || t.difficulty === difficulty)
  );

  return (
    <div>
      {/* Filter pills */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setType("all")}
          aria-pressed={type === "all"}
          className={`rounded-full px-3 py-1.5 font-hand text-sm transition ${
            type === "all"
              ? "bg-terracotta text-card shadow-paper"
              : "bg-peach text-ink hover:bg-peach/70"
          }`}
        >
          All
        </button>
        {CONTENT_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            aria-pressed={type === t}
            className={`rounded-full px-3 py-1.5 font-hand text-sm transition ${
              type === t
                ? "bg-terracotta text-card shadow-paper"
                : "bg-peach text-ink hover:bg-peach/70"
            }`}
          >
            {TYPE_LABELS[t][locale]}
          </button>
        ))}
        <span className="mx-2 h-5 w-px bg-line" aria-hidden />
        <button
          type="button"
          onClick={() => setDifficulty("all")}
          aria-pressed={difficulty === "all"}
          className={`rounded-full px-3 py-1.5 font-hand text-sm transition ${
            difficulty === "all"
              ? "bg-eucalyptus text-card shadow-paper"
              : "bg-sage text-ink hover:bg-sage/70"
          }`}
        >
          All
        </button>
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDifficulty(d)}
            aria-pressed={difficulty === d}
            className={`rounded-full px-3 py-1.5 font-hand text-sm transition ${
              difficulty === d
                ? "bg-eucalyptus text-card shadow-paper"
                : "bg-sage text-ink hover:bg-sage/70"
            }`}
          >
            {DIFFICULTY_LABELS[d][locale]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={emptyTitle} message={emptyMessage} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t, i) => (
            <TopicCard key={`${t.slug}-${t.type}`} topic={t} locale={locale} first={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}
