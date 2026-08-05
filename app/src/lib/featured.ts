import type { Locale, Topic } from "./types";
import { getTopics, sortTopics } from "./content";

/**
 * Deterministic "featured" tutorial: first tutorial in whitelist order.
 * (Curated override could live here later — nothing to override today.)
 */
export async function getFeaturedTutorial(): Promise<Topic | null> {
  const topics = sortTopics(await getTopics());
  return topics.find((t) => t.type === "tutorial") ?? null;
}

/** Recent cheatsheets (deterministic: same sort, take first N). */
export async function getRecentCheatsheets(locale: Locale, count = 3): Promise<Topic[]> {
  const topics = sortTopics(await getTopics());
  return topics.filter((t) => t.type === "cheatsheet").slice(0, count);
}

/** All syllabi (for the home progress card). */
export async function getSyllabi(): Promise<Topic[]> {
  const topics = sortTopics(await getTopics());
  return topics.filter((t) => t.type === "syllabus");
}
