"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface HeroSearchProps {
  placeholder: string;
  buttonLabel: string;
  locale: string;
}

export default function HeroSearch({ placeholder, buttonLabel, locale }: HeroSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/${locale}/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <form
      role="search"
      onSubmit={submit}
      className="mx-auto mt-8 flex w-full max-w-xl items-center gap-2"
    >
      <div className="relative flex-1">
        <svg
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full rounded-full border border-line bg-card py-3.5 pl-12 pr-4 font-body text-ink shadow-paper placeholder:text-ink-muted/60 focus:outline-none focus:ring-2 focus:ring-terracotta/60"
        />
      </div>
      <button
        type="submit"
        className="rounded-full bg-terracotta px-5 py-3.5 font-hand text-sm text-card shadow-paper transition hover:-rotate-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
      >
        {buttonLabel}
      </button>
    </form>
  );
}
