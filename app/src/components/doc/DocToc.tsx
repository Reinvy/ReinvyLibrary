"use client";

import { useEffect, useRef, useState } from "react";
import type { TocItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DocTocProps {
  toc: TocItem[];
  title: string;
  emptyLabel: string;
}

/** Sticky scroll-synced table of contents with active-heading highlighting. */
export default function DocToc({ toc, title, emptyLabel }: DocTocProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      if (raf.current) return;
      raf.current = requestAnimationFrame(() => {
        raf.current = null;
        const doc = document.documentElement;
        const total = doc.scrollHeight - window.innerHeight;
        setProgress(total > 0 ? Math.min(100, (window.scrollY / total) * 100) : 0);

        // find the last heading above the viewport top
        let current: string | null = null;
        for (const item of toc) {
          const el = document.getElementById(item.id);
          if (el && el.getBoundingClientRect().top <= 96) current = item.id;
        }
        setActiveId(current ?? toc[0]?.id ?? null);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [toc]);

  if (!toc.length) {
    return <p className="font-hand text-sm text-ink-muted">{emptyLabel}</p>;
  }

  return (
    <nav aria-label={title} className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <p className="mb-3 font-display text-sm font-semibold text-ink">{title}</p>
      {/* scroll progress bar */}
      <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-terracotta transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ul className="space-y-1.5">
        {toc.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                "block rounded-lg px-2 py-1 font-body text-sm leading-snug transition",
                item.level === 3 && "ml-3 border-l border-line pl-3",
                activeId === item.id
                  ? "bg-peach text-ink"
                  : "text-ink-muted hover:bg-peach/40 hover:text-ink"
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
