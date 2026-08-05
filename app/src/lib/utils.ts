import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** GitHub-flavored slugify used for heading anchors (matches rehype-slug default). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
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
