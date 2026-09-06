"use client";

import { useGamification } from "@/components/providers/GamificationProvider";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  entryKey: string;
  title: string;
  url: string;
  saveLabel: string;
  savedLabel: string;
  className?: string;
}

/** Sticker-style bookmark toggle persisted in the gamification store. */
export default function BookmarkButton({ entryKey, title, url, saveLabel, savedLabel, className }: BookmarkButtonProps) {
  const { state, ready, toggleBookmark } = useGamification();
  const saved = ready && state.bookmarks.some((b) => b.key === entryKey);

  return (
    <button
      type="button"
      onClick={() => toggleBookmark({ key: entryKey, title, url, at: new Date().toISOString() })}
      aria-pressed={saved}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-hand text-sm shadow-paper transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60",
        saved
          ? "border-terracotta/50 bg-peach text-ink"
          : "border-line bg-card text-ink-muted hover:text-ink",
        className
      )}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
      </svg>
      {saved ? savedLabel : saveLabel}
    </button>
  );
}
