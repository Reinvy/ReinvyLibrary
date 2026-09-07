/**
 * ReinvyLibrary gamification engine — pure functions only (no window access).
 * XP is the common currency: every meaningful learning action feeds one
 * number, which drives levels, quests, badges and the stamp book.
 */

export const XP_REWARDS = {
  /** reading XP depends on article length, see xpForDoc() */
  DOC_SHORT: 25,
  DOC_MEDIUM: 50,
  DOC_LONG: 75,
  CHECKLIST_ITEM: 10,
  SNIPPET_COPY: 5,
  /** max snippet-copy XP per day (anti-farming: 6 copies) */
  SNIPPET_COPY_DAILY_CAP: 30,
  DAILY_VISIT: 10,
  DAILY_QUEST_BONUS: 30,
  SYLLABUS_COMPLETE: 200,
  BILINGUAL_READ: 40,
  BOOKMARK_ADD: 10,
  FOCUS_SESSION: 20,
} as const;

export interface LevelInfo {
  level: number;
  titleEn: string;
  titleId: string;
}

/** Cozy scrapbook level titles (EN + ID). */
export const LEVELS: LevelInfo[] = [
  { level: 1, titleEn: "Paper Egg", titleId: "Telur Kertas" },
  { level: 2, titleEn: "Bookworm", titleId: "Kutu Buku" },
  { level: 3, titleEn: "Shelf Explorer", titleId: "Penjelajah Rak" },
  { level: 4, titleEn: "Sticker Collector", titleId: "Kolektor Stiker" },
  { level: 5, titleEn: "Little Librarian", titleId: "Pustakawan Cilik" },
  { level: 6, titleEn: "Washi Keeper", titleId: "Penjaga Washi" },
  { level: 7, titleEn: "Storyteller", titleId: "Pendongeng" },
  { level: 8, titleEn: "Stamp Master", titleId: "Master Stempel" },
  { level: 9, titleEn: "Curator", titleId: "Kurator" },
  { level: 10, titleEn: "Scrapbook Legend", titleId: "Legenda Scrapbook" },
];

/** Total-XP thresholds for levels 1..10. Beyond 10: +600 XP per level. */
export const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700];

export function levelForTotalXp(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp));
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      const base = i + 1;
      if (base < 10) return base;
      const extra = Math.floor((xp - LEVEL_THRESHOLDS[9]) / 600);
      return 10 + extra;
    }
  }
  return 1;
}

export function levelTitle(level: number, locale: "en" | "id"): string {
  const known = LEVELS[Math.min(level, 10) - 1];
  const base = locale === "en" ? known.titleEn : known.titleId;
  return level <= 10 ? base : `${base} +${level - 10}`;
}

export function xpBoundsForLevel(level: number): { floor: number; ceiling: number | null } {
  if (level < 10) {
    return { floor: LEVEL_THRESHOLDS[level - 1], ceiling: LEVEL_THRESHOLDS[level] };
  }
  const floor = LEVEL_THRESHOLDS[9] + (level - 10) * 600;
  return { floor, ceiling: floor + 600 };
}

export function progressToNextLevel(totalXp: number): {
  level: number;
  pct: number;
  remaining: number;
} {
  const level = levelForTotalXp(totalXp);
  const { floor, ceiling } = xpBoundsForLevel(level);
  if (ceiling === null) return { level, pct: 100, remaining: 0 };
  const pct = Math.min(100, Math.max(0, Math.round(((totalXp - floor) / (ceiling - floor)) * 100)));
  return { level, pct, remaining: Math.max(0, ceiling - Math.floor(totalXp)) };
}

/** XP for finishing a document, scaled by reading time. */
export function xpForDoc(readingMinutes: number): number {
  if (readingMinutes < 3) return XP_REWARDS.DOC_SHORT;
  if (readingMinutes < 8) return XP_REWARDS.DOC_MEDIUM;
  return XP_REWARDS.DOC_LONG;
}

export type BadgeRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const BADGE_XP_BONUS: Record<BadgeRarity, number> = {
  common: 20,
  uncommon: 40,
  rare: 80,
  epic: 150,
  legendary: 300,
};

export interface BadgeDef {
  id: string;
  rarity: BadgeRarity;
  icon: string;
  nameEn: string;
  nameId: string;
  descEn: string;
  descId: string;
}

/**
 * 12 launch badges. Day-one achievable first (first-steps, paper-fan)
 * following the Duolingo lesson: day-one unlockers retain far better.
 */
export const BADGES: BadgeDef[] = [
  { id: "first-steps", rarity: "common", icon: "footprints", nameEn: "First Steps", nameId: "Langkah Pertama", descEn: "Finish your first read", descId: "Selesaikan bacaan pertamamu" },
  { id: "paper-fan", rarity: "common", icon: "bookmark", nameEn: "Paper Fan", nameId: "Penggemar Kertas", descEn: "Save 1 read to your shelf", descId: "Simpan 1 bacaan ke rakmu" },
  { id: "snippet-hunter", rarity: "common", icon: "scissors", nameEn: "Snippet Hunter", nameId: "Pemburu Snippet", descEn: "Copy 5 code snippets", descId: "Salin 5 snippet kode" },
  { id: "polyglot", rarity: "uncommon", icon: "languages", nameEn: "Polyglot", nameId: "Poliglot", descEn: "Read one topic in EN + ID", descId: "Baca satu topik dalam EN + ID" },
  { id: "deep-reader", rarity: "uncommon", icon: "glasses", nameEn: "Deep Reader", nameId: "Pembaca Tekun", descEn: "Finish a read longer than 5 min", descId: "Selesaikan bacaan lebih dari 5 menit" },
  { id: "explorer", rarity: "uncommon", icon: "compass", nameEn: "Explorer", nameId: "Penjelajah", descEn: "Read from 3 different categories", descId: "Baca dari 3 kategori berbeda" },
  { id: "tech-collector", rarity: "rare", icon: "stamp", nameEn: "Tech Collector", nameId: "Kolektor Teknologi", descEn: "Collect 3 technology stamps", descId: "Kumpulkan 3 stempel teknologi" },
  { id: "sage", rarity: "rare", icon: "scroll", nameEn: "Sage", nameId: "Resi", descEn: "Collect 7 technology stamps", descId: "Kumpulkan 7 stempel teknologi" },
  { id: "streak-3", rarity: "rare", icon: "flame", nameEn: "Warm Streak", nameId: "Streak Hangat", descEn: "3-day reading streak", descId: "Streak membaca 3 hari" },
  { id: "streak-7", rarity: "epic", icon: "zap", nameEn: "Blazing Week", nameId: "Seminggu Membara", descEn: "7-day reading streak", descId: "Streak membaca 7 hari" },
  { id: "syllabus-graduate", rarity: "epic", icon: "graduation", nameEn: "Syllabus Graduate", nameId: "Lulusan Silabus", descEn: "Complete all chapters of a syllabus", descId: "Tuntaskan semua bab sebuah silabus" },
  { id: "streak-30", rarity: "legendary", icon: "crown", nameEn: "Moon Librarian", nameId: "Pustakawan Bulan", descEn: "30-day reading streak", descId: "Streak membaca 30 hari" },
];

export type QuestKind = "complete-doc" | "copy-snippet" | "checklist-item";

export interface QuestDef {
  id: string;
  kind: QuestKind;
  target: number;
  titleEn: string;
  titleId: string;
}

/** Fixed daily quest set — small, achievable, resets at local midnight. */
export const DAILY_QUESTS: QuestDef[] = [
  { id: "q-read", kind: "complete-doc", target: 1, titleEn: "Read 1 page", titleId: "Baca 1 halaman" },
  { id: "q-copy", kind: "copy-snippet", target: 2, titleEn: "Copy 2 snippets", titleId: "Salin 2 snippet" },
  { id: "q-check", kind: "checklist-item", target: 3, titleEn: "Tick 3 checklist boxes", titleId: "Centang 3 kotak checklist" },
];
