"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  BADGES,
  BADGE_XP_BONUS,
  DAILY_QUESTS,
  XP_REWARDS,
  levelForTotalXp,
  xpForDoc,
  type QuestKind,
} from "@/lib/gamification/xp-engine";
import {
  GAMIFICATION_KEY,
  defaultQuests,
  defaultState,
  diffDays,
  importGamification,
  isoWeekKey,
  readGamification,
  todayKey,
  writeGamification,
  type BookmarkEntry,
  type GamificationState,
  type HistoryEntry,
} from "@/lib/gamification/storage";

export interface ToastItem {
  id: string;
  kind: "badge" | "level" | "quest" | "freeze" | "syllabus";
  badgeId?: string;
  xp?: number;
  level?: number;
  streak?: number;
}

interface MarkDocInput {
  slug: string;
  locale: "en" | "id";
  category: string;
  technology: string;
  readingMinutes: number;
  title: string;
  url: string;
}

interface GamificationContextValue {
  state: GamificationState;
  ready: boolean;
  toasts: ToastItem[];
  dismissToast: (id: string) => void;
  recordVisit: () => void;
  markDocComplete: (input: MarkDocInput) => { already: boolean; xp: number };
  recordCopy: () => { xp: number; capped: boolean };
  recordChecklistItem: (topicSlug: string, itemId: string) => { xp: number; already: boolean };
  recordSyllabusProgress: (topicSlug: string, done: number, total: number) => { completed: boolean; xp: number };
  toggleBookmark: (entry: BookmarkEntry) => { added: boolean };
  touchHistory: (entry: HistoryEntry) => void;
  updateHistoryProgress: (key: string, progress: number) => void;
  recordFocusSession: () => { xp: number };
  exportJson: () => string;
  importJson: (json: string) => boolean;
  resetAll: () => void;
}

const GamificationContext = createContext<GamificationContextValue | null>(null);

const QUEST_TARGETS = DAILY_QUESTS.map((q) => ({ id: q.id, target: q.target }));

function clone<T>(v: T): T {
  if (typeof structuredClone === "function") return structuredClone(v);
  return JSON.parse(JSON.stringify(v)) as T;
}

let toastSeq = 0;
function makeToast(t: Omit<ToastItem, "id">): ToastItem {
  toastSeq += 1;
  return { ...t, id: `toast-${Date.now()}-${toastSeq}` };
}

/** Reset daily buckets when the calendar day changed. */
function ensureToday(draft: GamificationState, today: string): void {
  if (draft.quests.date !== today) {
    draft.quests = { date: today, daily: defaultQuests(today, QUEST_TARGETS) };
  }
  if (draft.copiesToday.date !== today) {
    draft.copiesToday = { date: today, count: 0 };
  }
}

function bumpQuest(
  draft: GamificationState,
  kind: QuestKind,
  amount: number,
  toasts: ToastItem[]
): void {
  const questForKind = (id: string): QuestKind | null => {
    if (id === "q-read") return "complete-doc";
    if (id === "q-copy") return "copy-snippet";
    if (id === "q-check") return "checklist-item";
    return null;
  };
  for (const q of draft.quests.daily) {
    if (q.done || questForKind(q.id) !== kind) continue;
    q.progress = Math.min(q.target, q.progress + amount);
    if (q.progress >= q.target) {
      q.done = true;
      q.claimed = true;
      draft.totalXp += XP_REWARDS.DAILY_QUEST_BONUS;
      toasts.push(makeToast({ kind: "quest", xp: XP_REWARDS.DAILY_QUEST_BONUS }));
    }
  }
}

/** Unlock any newly-earned badges on the draft. Returns unlocked ids. */
function applyBadgeUnlocks(draft: GamificationState): string[] {
  const unlocked: string[] = [];
  const has = (id: string) => id in draft.badges;
  const grant = (id: string) => {
    if (has(id)) return;
    const def = BADGES.find((b) => b.id === id);
    if (!def) return;
    draft.badges[id] = new Date().toISOString();
    draft.totalXp += BADGE_XP_BONUS[def.rarity];
    unlocked.push(id);
  };

  if (Object.keys(draft.completedDocs).length >= 1) grant("first-steps");
  if (draft.bookmarks.length >= 1) grant("paper-fan");
  if (draft.totalCopies >= 5) grant("snippet-hunter");

  const slugs = Object.keys(draft.completedDocs).map((k) => k.split(":")[0]);
  const uniqueSlugs = new Set(slugs);
  for (const slug of uniqueSlugs) {
    if (draft.completedDocs[`${slug}:en`] && draft.completedDocs[`${slug}:id`]) {
      grant("polyglot");
      break;
    }
  }
  if (Object.values(draft.completedDocs).some((d) => d.minutes > 5)) grant("deep-reader");
  if (Object.keys(draft.categoriesRead).length >= 3) grant("explorer");
  if (Object.keys(draft.technologiesRead).length >= 3) grant("tech-collector");
  if (Object.keys(draft.technologiesRead).length >= 7) grant("sage");
  if (draft.longestStreak >= 3) grant("streak-3");
  if (draft.longestStreak >= 7) grant("streak-7");
  if (draft.longestStreak >= 30) grant("streak-30");
  if (Object.keys(draft.awardedSyllabi).length >= 1) grant("syllabus-graduate");

  return unlocked;
}

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GamificationState>(() => defaultState(todayKey(), QUEST_TARGETS));
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const stateRef = useRef(state);
  const visitedRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const pushToasts = useCallback((items: ToastItem[]) => {
    if (items.length === 0) return;
    setToasts((prev) => [...prev.slice(-3), ...items].slice(-4));
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /** Core mutation helper: compute next state from ref, set it, queue events. */
  const mutate = useCallback(
    (fn: (draft: GamificationState, events: ToastItem[]) => void) => {
      const prev = stateRef.current;
      const prevLevel = levelForTotalXp(prev.totalXp);
      const draft = clone(prev);
      const events: ToastItem[] = [];
      ensureToday(draft, todayKey());
      fn(draft, events);
      const newBadges = applyBadgeUnlocks(draft);
      for (const id of newBadges) {
        const def = BADGES.find((b) => b.id === id);
        events.push(makeToast({ kind: "badge", badgeId: id, xp: def ? BADGE_XP_BONUS[def.rarity] : undefined }));
      }
      const nextLevel = levelForTotalXp(draft.totalXp);
      if (nextLevel > prevLevel) {
        events.push(makeToast({ kind: "level", level: nextLevel }));
      }
      stateRef.current = draft;
      setState(draft);
      pushToasts(events);
    },
    [pushToasts]
  );

  const recordVisit = useCallback(() => {
    mutate((draft, events) => {
      const today = todayKey();
      // Weekly freeze refill (cap 2) on first visit of the week.
      const week = isoWeekKey();
      if (draft.lastFreezeWeek !== week) {
        draft.lastFreezeWeek = week;
        draft.freezes = Math.min(2, draft.freezes + 1);
      }
      if (draft.lastVisit === today) return;
      if (!draft.lastVisit) {
        draft.streak = 1;
      } else {
        const gap = diffDays(draft.lastVisit, today);
        if (gap === 1) {
          draft.streak += 1;
        } else if (gap === 2 && draft.freezes > 0) {
          draft.freezes -= 1;
          draft.streak += 1;
          events.push(makeToast({ kind: "freeze", streak: draft.streak }));
        } else if (gap <= 0) {
          return;
        } else {
          draft.streak = 1;
        }
      }
      draft.longestStreak = Math.max(draft.longestStreak, draft.streak);
      draft.lastVisit = today;
      draft.totalXp += XP_REWARDS.DAILY_VISIT;
    });
  }, [mutate]);

  // Auto-visit once per mount (counts the daily visit + streak).
  useEffect(() => {
    if (visitedRef.current) return;
    visitedRef.current = true;
    const stored = readGamification(QUEST_TARGETS);
    stateRef.current = stored;
    setState(stored);
    setReady(true);
    // Defer visit so initial paint isn't blocked.
    const t = window.setTimeout(() => {
      recordVisit();
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist + cross-tab sync.
  useEffect(() => {
    if (!ready) return;
    writeGamification(state);
  }, [state, ready]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== GAMIFICATION_KEY) return;
      try {
        const next = e.newValue ? (JSON.parse(e.newValue) as GamificationState) : null;
        if (next && next.version === 1) {
          stateRef.current = next;
          setState(next);
        }
      } catch {
        /* ignore corrupt cross-tab payload */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const markDocComplete = useCallback(
    (input: MarkDocInput) => {
      const key = `${input.slug}:${input.locale}`;
      const prev = stateRef.current;
      if (prev.completedDocs[key]) return { already: true, xp: 0 };
      let awarded = 0;
      mutate((draft, events) => {
        if (draft.completedDocs[key]) return;
        const xp = xpForDoc(input.readingMinutes);
        awarded = xp;
        draft.completedDocs[key] = { xp, at: new Date().toISOString(), minutes: input.readingMinutes };
        draft.categoriesRead[input.category] = (draft.categoriesRead[input.category] ?? 0) + 1;
        draft.technologiesRead[input.technology] = (draft.technologiesRead[input.technology] ?? 0) + 1;
        draft.totalXp += xp;
        // Bilingual bonus: same slug finished in both locales.
        const other = `${input.slug}:${input.locale === "en" ? "id" : "en"}`;
        if (draft.completedDocs[other]) {
          draft.totalXp += XP_REWARDS.BILINGUAL_READ;
          awarded += XP_REWARDS.BILINGUAL_READ;
        }
        // History (most recent first, cap 10).
        const entry: HistoryEntry = { key, title: input.title, url: input.url, at: new Date().toISOString(), progress: 100 };
        draft.history = [entry, ...draft.history.filter((h) => h.key !== key)].slice(0, 10);
        bumpQuest(draft, "complete-doc", 1, events);
        void events;
      });
      return { already: false, xp: awarded };
    },
    [mutate]
  );

  const recordCopy = useCallback(() => {
    const prev = stateRef.current;
    const today = todayKey();
    const used = prev.copiesToday.date === today ? prev.copiesToday.count : 0;
    if (used * XP_REWARDS.SNIPPET_COPY >= XP_REWARDS.SNIPPET_COPY_DAILY_CAP) {
      return { xp: 0, capped: true };
    }
    mutate((draft, events) => {
      draft.totalCopies += 1;
      draft.copiesToday = { date: todayKey(), count: draft.copiesToday.date === todayKey() ? draft.copiesToday.count + 1 : 1 };
      draft.totalXp += XP_REWARDS.SNIPPET_COPY;
      bumpQuest(draft, "copy-snippet", 1, events);
    });
    return { xp: XP_REWARDS.SNIPPET_COPY, capped: false };
  }, [mutate]);

  const recordChecklistItem = useCallback(
    (topicSlug: string, itemId: string) => {
      const key = `${topicSlug}:${itemId}`;
      if (stateRef.current.awardedChecklist[key]) return { xp: 0, already: true };
      mutate((draft, events) => {
        if (draft.awardedChecklist[key]) return;
        draft.awardedChecklist[key] = Date.now();
        draft.totalXp += XP_REWARDS.CHECKLIST_ITEM;
        bumpQuest(draft, "checklist-item", 1, events);
      });
      return { xp: XP_REWARDS.CHECKLIST_ITEM, already: false };
    },
    [mutate]
  );

  const recordSyllabusProgress = useCallback(
    (topicSlug: string, done: number, total: number) => {
      if (total <= 0 || done < total || stateRef.current.awardedSyllabi[topicSlug]) {
        return { completed: false, xp: 0 };
      }
      mutate((draft, events) => {
        if (draft.awardedSyllabi[topicSlug]) return;
        draft.awardedSyllabi[topicSlug] = Date.now();
        draft.totalXp += XP_REWARDS.SYLLABUS_COMPLETE;
        events.push(makeToast({ kind: "syllabus", xp: XP_REWARDS.SYLLABUS_COMPLETE }));
      });
      return { completed: true, xp: XP_REWARDS.SYLLABUS_COMPLETE };
    },
    [mutate]
  );

  const toggleBookmark = useCallback(
    (entry: BookmarkEntry) => {
      const exists = stateRef.current.bookmarks.some((b) => b.key === entry.key);
      mutate((draft) => {
        if (exists) {
          draft.bookmarks = draft.bookmarks.filter((b) => b.key !== entry.key);
        } else {
          draft.bookmarks = [...draft.bookmarks, { ...entry, at: new Date().toISOString() }].slice(0, 50);
          if (!draft.awardedBookmarks[entry.key]) {
            draft.awardedBookmarks[entry.key] = Date.now();
            draft.totalXp += XP_REWARDS.BOOKMARK_ADD;
          }
        }
      });
      return { added: !exists };
    },
    [mutate]
  );

  const updateHistoryProgress = useCallback((key: string, progress: number) => {
    const prev = stateRef.current;
    const existing = prev.history.find((h) => h.key === key);
    if (!existing || Math.abs(existing.progress - progress) < 5) return;
    const draft = clone(prev);
    draft.history = draft.history.map((h) => (h.key === key ? { ...h, progress } : h));
    stateRef.current = draft;
    setState(draft);
  }, []);

  /** Upsert a history entry without granting XP (view / scroll progress). */
  const touchHistory = useCallback((entry: HistoryEntry) => {
    const prev = stateRef.current;
    const existing = prev.history.find((h) => h.key === entry.key);
    if (existing) {
      if (existing.progress >= entry.progress) return;
      const draft = clone(prev);
      draft.history = draft.history.map((h) =>
        h.key === entry.key ? { ...h, progress: entry.progress } : h
      );
      stateRef.current = draft;
      setState(draft);
      return;
    }
    const draft = clone(prev);
    draft.history = [{ ...entry, progress: Math.min(entry.progress, 99) }, ...draft.history].slice(0, 10);
    stateRef.current = draft;
    setState(draft);
  }, []);

  const recordFocusSession = useCallback(() => {
    mutate((draft) => {
      draft.focusSessions += 1;
      draft.totalXp += XP_REWARDS.FOCUS_SESSION;
    });
    return { xp: XP_REWARDS.FOCUS_SESSION };
  }, [mutate]);

  const exportJson = useCallback(() => {
    return JSON.stringify({ exportedAt: new Date().toISOString(), state: stateRef.current }, null, 2);
  }, []);

  const importJson = useCallback(
    (json: string) => {
      const next = importGamification(json, QUEST_TARGETS);
      if (!next) return false;
      stateRef.current = next;
      setState(next);
      return true;
    },
    []
  );

  const resetAll = useCallback(() => {
    const fresh = defaultState(todayKey(), QUEST_TARGETS);
    stateRef.current = fresh;
    setState(fresh);
    setToasts([]);
  }, []);

  const value = useMemo<GamificationContextValue>(
    () => ({
      state,
      ready,
      toasts,
      dismissToast,
      recordVisit,
      markDocComplete,
      recordCopy,
      recordChecklistItem,
      recordSyllabusProgress,
      toggleBookmark,
      touchHistory,
      updateHistoryProgress,
      recordFocusSession,
      exportJson,
      importJson,
      resetAll,
    }),
    [
      state,
      ready,
      toasts,
      dismissToast,
      recordVisit,
      markDocComplete,
      recordCopy,
      recordChecklistItem,
      recordSyllabusProgress,
      toggleBookmark,
      touchHistory,
      updateHistoryProgress,
      recordFocusSession,
      exportJson,
      importJson,
      resetAll,
    ]
  );

  return <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>;
}

export function useGamification(): GamificationContextValue {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error("useGamification must be used within GamificationProvider");
  return ctx;
}
