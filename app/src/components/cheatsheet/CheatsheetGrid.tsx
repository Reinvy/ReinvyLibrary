"use client";

import { useMemo, useState } from "react";
import type { Snippet } from "@/lib/types";
import SnippetCard from "./SnippetCard";
import { cn } from "@/lib/utils";

interface CheatsheetGridProps {
  snippets: Snippet[];
  labels: {
    filterBy: string;
    allLanguages: string;
    allSections: string;
    snippets: string;
    copy: string;
    copied: string;
    lines: string;
  };
}

/** Filterable masonry-ish grid of snippet cards. */
export default function CheatsheetGrid({ snippets, labels }: CheatsheetGridProps) {
  const [language, setLanguage] = useState<string>("all");
  const [section, setSection] = useState<string>("all");

  const languages = useMemo(
    () => Array.from(new Set(snippets.map((s) => s.language || "text"))).sort(),
    [snippets]
  );
  const sections = useMemo(
    () => Array.from(new Set(snippets.map((s) => s.section).filter(Boolean))) as string[],
    [snippets]
  );

  const filtered = snippets.filter(
    (s) =>
      (language === "all" || (s.language || "text") === language) &&
      (section === "all" || s.section === section)
  );

  return (
    <div>
      {/* Filter pills */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="font-hand text-sm text-ink-muted">{labels.filterBy}:</span>
        <button
          type="button"
          onClick={() => setLanguage("all")}
          aria-pressed={language === "all"}
          className={cn(
            "rounded-full px-3 py-1.5 font-hand text-sm transition",
            language === "all"
              ? "bg-terracotta text-card shadow-paper"
              : "bg-peach text-ink hover:bg-peach/70"
          )}
        >
          {labels.allLanguages}
        </button>
        {languages.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLanguage(l)}
            aria-pressed={language === l}
            className={cn(
              "rounded-full px-3 py-1.5 font-hand text-sm transition",
              language === l
                ? "bg-terracotta text-card shadow-paper"
                : "bg-peach text-ink hover:bg-peach/70"
            )}
          >
            {l}
          </button>
        ))}
        {sections.length > 0 && (
          <>
            <span className="mx-1 h-5 w-px bg-line" aria-hidden />
            <button
              type="button"
              onClick={() => setSection("all")}
              aria-pressed={section === "all"}
              className={cn(
                "rounded-full px-3 py-1.5 font-hand text-sm transition",
                section === "all"
                  ? "bg-eucalyptus text-card shadow-paper"
                  : "bg-sage text-ink hover:bg-sage/70"
              )}
            >
              {labels.allSections}
            </button>
            {sections.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSection(s)}
                aria-pressed={section === s}
                className={cn(
                  "rounded-full px-3 py-1.5 font-hand text-sm transition",
                  section === s
                    ? "bg-eucalyptus text-card shadow-paper"
                    : "bg-sage text-ink hover:bg-sage/70"
                )}
              >
                {s}
              </button>
            ))}
          </>
        )}
      </div>

      <p className="mb-4 font-hand text-sm text-ink-muted">
        {filtered.length} {labels.snippets}
      </p>

      {/* CSS-columns masonry */}
      <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5">
        {filtered.map((snippet) => (
          <SnippetCard key={snippet.id} snippet={snippet} labels={labels} />
        ))}
      </div>
    </div>
  );
}
