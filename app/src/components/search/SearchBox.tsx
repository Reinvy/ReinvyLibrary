"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FlexSearch from "flexsearch";
import type { Locale, SearchDoc } from "@/lib/types";
import EmptyState from "@/components/ui/EmptyState";

export interface SearchHit {
  doc: SearchDoc;
  score: number;
}

interface SearchBoxProps {
  docs: SearchDoc[];
  initialQuery?: string;
  locale: Locale;
  dictionary: {
    placeholder: string;
    results: string;
    noResultsTitle: string;
    noResultsMessage: string;
    popularTags: string;
  };
  browseLabel: string;
}

const POPULAR_TAGS = ["tutorial", "cheatsheet", "syllabus", "guide", "nextjs", "postgres"];

function buildIndex(docs: SearchDoc[]): FlexSearch.Index {
  const idx = new FlexSearch.Index({ tokenize: "forward", optimize: true, resolution: 9 });
  docs.forEach((doc, i) => idx.add(i, `${doc.title} ${doc.description} ${doc.tags.join(" ")}`));
  return idx;
}

function queryIndex(idx: FlexSearch.Index, docs: SearchDoc[], q: string): SearchHit[] {
  const needle = q.trim();
  if (!needle) return [];
  try {
    return idx
      .search(needle, { limit: 40, suggest: true })
      .map((i) => ({ doc: docs[Number(i)], score: 1 }))
      .filter((h) => h.doc);
  } catch {
    return [];
  }
}

/**
 * Client-side fuzzy search over the full payload shipped in the page.
 * `initialQuery` comes from `?q=` so reload/share deep-links correctly.
 * Parent remounts via `key={initialQuery}` on back/forward navigation.
 */
export default function SearchBox({ docs, initialQuery = "", locale, dictionary, browseLabel }: SearchBoxProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);

  // Memoized index (render-phase pure computation, no refs).
  const index = useMemo(() => buildIndex(docs), [docs]);
  const results = useMemo(
    () => queryIndex(index, docs, deferredQuery),
    [index, docs, deferredQuery]
  );

  const highlight = (text: string, q: string) => {
    if (!q.trim()) return text;
    const lower = text.toLowerCase();
    const idx = lower.indexOf(q.toLowerCase());
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded bg-sticky px-0.5">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  const popular = useMemo(() => POPULAR_TAGS, []);

  const applyQuery = (tag: string) => {
    setQuery(tag);
    router.replace(`/${locale}/search?q=${encodeURIComponent(tag)}`, { scroll: false });
  };

  return (
    <div className="w-full">
      <form
        role="search"
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          const q = query.trim();
          router.replace(
            q ? `/${locale}/search?q=${encodeURIComponent(q)}` : `/${locale}/search`,
            { scroll: false }
          );
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={dictionary.placeholder}
          aria-label={dictionary.placeholder}
          role="combobox"
          aria-expanded={query.trim().length > 0}
          aria-controls="search-results"
          aria-autocomplete="list"
          className="w-full rounded-full border border-line bg-card px-6 py-4 pl-14 font-body text-ink shadow-paper placeholder:text-ink-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
        />
        <svg
          aria-hidden
          className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </form>

      {!query.trim() && (
        <div className="mt-10">
          <p className="font-hand text-lg text-ink-muted">{dictionary.popularTags}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {popular.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => applyQuery(tag)}
                className="rounded-full bg-peach px-3 py-1.5 font-hand text-sm text-ink transition hover:rotate-1 hover:bg-peach/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {query.trim() && (
        <div className="mt-8 space-y-3" id="search-results" role="region" aria-live="polite">
          <p className="font-hand text-sm text-ink-muted" aria-live="polite">
            {results.length} {dictionary.results}
          </p>
          {results.length === 0 && (
            <EmptyState
              title={dictionary.noResultsTitle}
              message={dictionary.noResultsMessage}
              action={
                <a
                  href={`/${locale}/browse`}
                  className="inline-block rounded-full bg-terracotta px-5 py-2.5 font-hand text-sm text-card shadow-paper transition hover:-rotate-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
                >
                  {browseLabel}
                </a>
              }
            />
          )}
          {results.map(({ doc }) => (
            <a
              key={doc.id}
              href={`/${doc.locale}/${doc.category}/${doc.technology}/${doc.type === "cheatsheet" ? "cheatsheets" : doc.type === "tutorial" ? "tutorials" : doc.type === "guide" ? "guides" : "syllabi"}/${doc.path.split("/").pop()!.replace(/\.md$/, "").replace(/_id$/, "")}`}
              className="block rounded-2xl border border-line bg-card p-5 shadow-paper transition hover:-rotate-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-peach px-2.5 py-0.5 font-hand text-xs text-ink">
                  {doc.type}
                </span>
                <span className="rounded-full bg-sage px-2.5 py-0.5 font-hand text-xs text-ink">
                  {doc.technology}
                </span>
              </div>
              <h3 className="mt-2 font-display text-lg font-semibold text-ink">
                {highlight(doc.title, query)}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                {highlight(doc.description, query)}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
