"use client";

import { useEffect } from "react";
import { useGamification } from "@/components/providers/GamificationProvider";

/**
 * Seeds the "continue reading" history when a doc is viewed and reports
 * scroll progress. Renders nothing. XP is only granted via MarkComplete.
 */
export default function DocHistoryTracker({
  entryKey,
  title,
  url,
}: {
  entryKey: string;
  title: string;
  url: string;
}) {
  const { ready, touchHistory } = useGamification();

  useEffect(() => {
    if (!ready) return;
    touchHistory({ key: entryKey, title, url, at: new Date().toISOString(), progress: 5 });
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        const el = document.documentElement;
        const max = el.scrollHeight - el.clientHeight;
        if (max <= 0) return;
        const pct = Math.min(99, Math.round((window.scrollY / max) * 100));
        if (pct >= 15) {
          touchHistory({ key: entryKey, title, url, at: new Date().toISOString(), progress: pct });
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [ready, entryKey, title, url, touchHistory]);

  return null;
}
