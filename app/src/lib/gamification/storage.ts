/**
 * Gamification persistence — localStorage only (no backend, no login).
 * SSR-safe: every function guards `typeof window === "undefined"`.
 * Forward-compatible: `version` + optional `userId` for a future backend.
 */

export const GAMIFICATION_KEY = "rl:gamification:v1";

export interface HistoryEntry {
  key: string;
  title: string;
  url: string;
  at: string;
  progress: number;
}

export interface BookmarkEntry {
  key: string;
  title: string;
  url: string;
  at: string;
}

export interface QuestProgress {
  id: string;
  progress: number;
  target: number;
  done: boolean;
  claimed: boolean;
}

export interface GamificationState {
  version: 1;
  userId?: string;
  totalXp: number;
  lastVisit: string | null;
  streak: number;
  longestStreak: number;
  freezes: number;
  lastFreezeWeek: string | null;
  completedDocs: Record<string, { xp: number; at: string; minutes: number }>;
  categoriesRead: Record<string, number>;
  technologiesRead: Record<string, number>;
  totalCopies: number;
  copiesToday: { date: string; count: number };
  awardedChecklist: Record<string, number>;
  awardedBookmarks: Record<string, number>;
  awardedSyllabi: Record<string, number>;
  badges: Record<string, string>;
  quests: { date: string; daily: QuestProgress[] };
  history: HistoryEntry[];
  bookmarks: BookmarkEntry[];
  focusSessions: number;
}

export function defaultQuests(date: string, targets: { id: string; target: number }[]): QuestProgress[] {
  return targets.map((t) => ({ id: t.id, progress: 0, target: t.target, done: false, claimed: false }));
}

export function defaultState(today: string, questTargets: { id: string; target: number }[]): GamificationState {
  return {
    version: 1,
    totalXp: 0,
    lastVisit: null,
    streak: 0,
    longestStreak: 0,
    freezes: 1,
    lastFreezeWeek: null,
    completedDocs: {},
    categoriesRead: {},
    technologiesRead: {},
    totalCopies: 0,
    copiesToday: { date: today, count: 0 },
    awardedChecklist: {},
    awardedBookmarks: {},
    awardedSyllabi: {},
    badges: {},
    quests: { date: today, daily: defaultQuests(today, questTargets) },
    history: [],
    bookmarks: [],
    focusSessions: 0,
  };
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isoWeekKey(d = new Date()): string {
  const copy = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((copy.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${copy.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Whole-day difference between two YYYY-MM-DD keys. */
export function diffDays(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86400000);
}

function isValidState(v: unknown): v is GamificationState {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return s.version === 1 && typeof s.totalXp === "number" && Array.isArray(s.history);
}

export function readGamification(questTargets: { id: string; target: number }[]): GamificationState {
  const today = todayKey();
  const fallback = defaultState(today, questTargets);
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(GAMIFICATION_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidState(parsed)) return fallback;
    // Heal missing fields from older snapshots.
    return {
      ...fallback,
      ...parsed,
      copiesToday: parsed.copiesToday ?? fallback.copiesToday,
      quests: parsed.quests ?? fallback.quests,
    };
  } catch {
    return fallback;
  }
}

export function writeGamification(state: GamificationState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GAMIFICATION_KEY, JSON.stringify(state));
  } catch {
    /* storage full/unavailable — degrade silently */
  }
}

export function exportGamification(state: GamificationState): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), state }, null, 2);
}

export function importGamification(
  json: string,
  questTargets: { id: string; target: number }[]
): GamificationState | null {
  try {
    const parsed = JSON.parse(json) as { state?: unknown };
    const candidate = parsed.state ?? parsed;
    if (!isValidState(candidate)) return null;
    const today = todayKey();
    return { ...defaultState(today, questTargets), ...candidate };
  } catch {
    return null;
  }
}
