"use client";

import { useEffect, useState } from "react";
import type { Locale, Topic } from "@/lib/types";
import { TYPE_DIR, TYPE_LABELS } from "@/lib/constants";
import { topicUrl } from "@/lib/urls";
import BookmarkTab from "@/components/ui/BookmarkTab";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  siblings: Topic[];
  locale: Locale;
  activeSlug: string;
  /** localized chrome labels */
  labels: { overview: string; checklists: string };
}

/**
 * Bookmark-tab sidebar navigation. On mobile collapses to a cozy
 * slide-over drawer (keyboard accessible, Escape closes).
 */
export default function SidebarNav({ siblings, locale, activeSlug, labels }: SidebarNavProps) {
  const [open, setOpen] = useState(false);

  // Close drawer on Escape and on route change.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tabs = siblings.map((t) => ({
    href: topicUrl(locale, t.category, t.technology, TYPE_DIR[t.type], t.slug),
    label: t.title,
    active: t.slug === activeSlug,
    typeLabel: TYPE_LABELS[t.type][locale],
  }));

  return (
    <>
      {/* Desktop sidebar (sticky, always visible) */}
      <aside className="sticky top-24 hidden max-h-[calc(100vh-8rem)] w-56 shrink-0 overflow-y-auto lg:block">
        <p className="mb-2 font-hand text-sm text-ink-muted">{labels.overview}</p>
        <div className="space-y-1.5">
          {tabs.map((tab) => (
            <BookmarkTab
              key={tab.href}
              href={tab.href}
              label={tab.label}
              active={tab.active}
              rotate
            />
          ))}
        </div>
      </aside>

      {/* Mobile: trigger + slide-over drawer */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="bookmark-drawer"
          className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-sticky px-4 py-2 font-hand text-sm text-ink shadow-lift transition hover:-rotate-1"
        >
          <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
          {labels.overview}
        </button>

        <div
          id="bookmark-drawer"
          className={cn(
            "fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm transition-opacity",
            open ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setOpen(false)}
          aria-hidden
        />
        <div
          className={cn(
            "fixed left-0 top-0 z-50 h-full w-72 max-w-[85vw] overflow-y-auto bg-card p-4 pt-16 shadow-lift transition-transform",
            open ? "translate-x-0" : "-translate-x-full"
          )}
          role="dialog"
          aria-modal="true"
          aria-label={labels.overview}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full bg-peach p-2 text-ink transition hover:rotate-6"
          >
            <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="space-y-1.5">
            {tabs.map((tab) => (
              <BookmarkTab
                key={tab.href}
                href={tab.href}
                label={tab.label}
                active={tab.active}
                rotate
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
