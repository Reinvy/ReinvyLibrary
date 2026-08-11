import type { ContentFile, Locale, Topic } from "./types";

/**
 * Pure URL/data helpers — safe to import from client components
 * (no server-only dependencies, no fs/network).
 */

export function topicUrl(
  locale: Locale,
  category: string,
  technology: string,
  typeDir: string,
  slug: string
): string {
  return `/${locale}/${category}/${technology}/${typeDir}/${slug}`;
}

export function contentFileUrl(file: ContentFile): string {
  return topicUrl(
    file.frontmatter.locale,
    file.category,
    file.technology,
    file.typeDir,
    file.slug
  );
}

/** File for a topic in a given locale (falls back to the other locale). */
export function fileForLocale(topic: Topic, locale: Locale): ContentFile {
  return (locale === "en" ? topic.en : topic.id) ?? topic.en ?? topic.id!;
}

/** The paired file in the other locale, when it exists. */
export function siblingFile(
  topic: { en?: ContentFile; id?: ContentFile },
  locale: Locale
): ContentFile | null {
  const other = locale === "en" ? "id" : "en";
  return topic[other] ?? null;
}
