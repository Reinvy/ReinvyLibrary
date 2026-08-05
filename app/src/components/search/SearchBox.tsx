"use client";

import { useMemo, useRef, useState } from "react";
import FlexSearch from "flexsearch";
import type { SearchDoc } from "@/lib/types";

export interface SearchHit {
  doc: SearchDoc;
  score: number;
}

interface SearchBoxProps {
  docs: SearchDoc[];
  dictionary: {
    placeholder: string;
    results: string;
    noResultsTitle: string;
    noResultsMessage: string;
    popularTags: string;
  };
}

const POPULAR_TAGS = ["tutorial", "cheatsheet", "syllabus", "guide", "nextjs", "postgres"];

/**
 * Client-side fuzzy search over the full payload shipped in the page.
 * Index built once per page load (blocking doc? no — lazy on first query).
 */
export default function SearchBox({ docs, dictionary }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const indexRef = useRef<FlexSearch.Index | null>(null);

  const performSearch = (q: string) => {
    const needle = q.trim();
    if (!needle) {
      setResults([]);
      return;
    }
    if (!indexRef.current) {
      const idx = new FlexSearch.Index({
        tokenize: "forward",
        optimize: true,
        resolution: 9,
      });
      docs.forEach((doc, i) => idx.add(i, `${doc.title} ${doc.description} ${doc.tags.join(" ")}`));
      indexRef.current = idx;
    }
    const hits = indexRef.current.search(needle, { limit: 40, suggest: true });
    setResults(
      hits.map((i) => ({ doc: docs[Number(i)], score: 1 })).filter((h) => h.doc)
    );
  };

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

  return (
    <div className="w-full">
      <form
        role="search"
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          performSearch(query);
        }}
      >
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            performSearch(e.target.value);
          }}
          placeholder={dictionary.placeholder}
          aria-label={dictionary.placeholder}
          className="w-full rounded-full border border-line bg-card px-6 py-4 pl-14 font-body text-ink shadow-paper placeholder:text-ink-muted/60 focus:outline-none focus:ring-2 focus:ring-terracotta/60"
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
                onClick={() => {
                  setQuery(tag);
                  performSearch(tag);
                }}
                className="rounded-full bg-peach px-3 py-1.5 font-hand text-sm text-ink transition hover:rotate-1 hover:bg-peach/80"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {query.trim() && (
        <div className="mt-8 space-y-3">
          <p className="font-hand text-sm text-ink-muted">
            {results.length} {dictionary.results}
          </p>
          {results.length === 0 && (
            <div className="rounded-2xl border border-line bg-card p-8 text-center">
              <p className="font-hand text-2xl text-ink">{dictionary.noResultsTitle}</p>
              <p className="mt-2 text-ink-muted">{dictionary.noResultsMessage}</p>
            </div>
          )}
          {results.map(({ doc }) => (
            <a
              key={doc.id}
              href={`/${doc.locale}/${doc.category}/${doc.technology}/${doc.type === "cheatsheet" ? "cheatsheets" : doc.type === "tutorial" ? "tutorials" : doc.type === "guide" ? "guides" : "syllabi"}/${doc.path.split("/").pop()!.replace(/\.md$/, "").replace(/_id$/, "")}`}
              className="block rounded-2xl border border-line bg-card p-5 shadow-paper transition hover:-rotate-0.5 hover:shadow-lift"
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
