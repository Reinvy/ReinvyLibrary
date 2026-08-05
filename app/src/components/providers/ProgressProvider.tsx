"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export interface ProgressState {
  [topicSlug: string]: {
    checked: string[];
  };
}

interface ProgressContextValue {
  progress: ProgressState;
  /** toggle a checklist item's checked state */
  toggleItem: (topicSlug: string, itemId: string) => void;
  /** how many items are checked for a topic */
  checkedCount: (topicSlug: string) => number;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

const STORAGE_KEY = "rl:progress:v1";

function readStorage(): ProgressState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressState) : {};
  } catch {
    return {};
  }
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  // Lazy init from localStorage on the client (avoids effect setState cascade).
  const [progress, setProgress] = useState<ProgressState>(() => {
    if (typeof window === "undefined") return {};
    return readStorage();
  });

  const toggleItem = useCallback((topicSlug: string, itemId: string) => {
    setProgress((prev) => {
      const topic = prev[topicSlug] ?? { checked: [] };
      const checked = topic.checked.includes(itemId)
        ? topic.checked.filter((id) => id !== itemId)
        : [...topic.checked, itemId];
      const next: ProgressState = { ...prev, [topicSlug]: { checked } };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage full/unavailable — degrade silently */
      }
      return next;
    });
  }, []);

  const checkedCount = useCallback(
    (topicSlug: string) => (progress[topicSlug]?.checked ?? []).length,
    [progress]
  );

  return (
    <ProgressContext.Provider value={{ progress, toggleItem, checkedCount }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}
