import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** GitHub-flavored slugify used for heading anchors (matches rehype-slug / github-slugger base). */
export function slugify(text: string): string {
  if (typeof text !== "string") return "";
  // Matches github-slugger `slug()`: lowercase, strip punctuation, space -> hyphen.
  // Uses unicode-aware classes so Indonesian text behaves like GitHub.
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}_ -]/gu, "")
    .replace(/ /g, "-");
}

/**
 * Dedupes slugs exactly like github-slugger (`slug`, `slug-1`, `slug-2`, ...).
 * Pass a shared Map across headings in document order.
 */
export function uniqueSlug(base: string, occurrences: Map<string, number>): string {
  const fallback = base || "section";
  let result = fallback;
  const original = fallback;
  while (occurrences.has(result)) {
    const count = (occurrences.get(original) ?? 0) + 1;
    occurrences.set(original, count);
    result = `${original}-${count}`;
  }
  occurrences.set(result, 0);
  // Ensure the base counter exists for future duplicates.
  if (!occurrences.has(original)) occurrences.set(original, 0);
  return result;
}

/** Rough reading time in minutes based on plain-text word count. */
export function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Derives searchable tag chips from a file's metadata (content has no tags field). */
export function deriveTags(input: {
  category: string;
  technology: string;
  type: string;
  difficulty: string;
}): string[] {
  return [input.category, input.technology, input.type, input.difficulty];
}
