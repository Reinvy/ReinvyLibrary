import "server-only";

import type {
  Category,
  ContentFile,
  ContentType,
  Difficulty,
  Frontmatter,
  Locale,
  Technology,
  Topic,
  TypeDir,
} from "./types";
import {
  CATEGORIES,
  DIR_TO_TYPE,
  TECHNOLOGIES,
  TYPE_DIR,
} from "./constants";
import { getContentSource } from "./github";

// --- Parsing -------------------------------------------------------------

/** Minimal frontmatter parser (gray-matter style, no dependency). */
export function parseFrontmatter(raw: string): { frontmatter: Frontmatter; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  const frontmatter: Record<string, string> = {};
  if (match) {
    for (const line of match[1].split(/\r?\n/)) {
      const kv = /^([A-Za-z_]+):\s*(.*)$/.exec(line);
      if (kv) frontmatter[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  const body = match ? raw.slice(match[0].length) : raw;
  return {
    frontmatter: normalizeFrontmatter(frontmatter),
    body,
  };
}

function normalizeFrontmatter(fm: Record<string, string>): Frontmatter {
  const category = (fm.category ?? "") as Category;
  const technology = (fm.technology ?? "") as Technology;
  const difficulty = (fm.difficulty ?? "") as Difficulty;
  const type = (fm.type ?? "") as ContentType;
  const locale = (fm.locale ?? "") as Locale;
  return {
    title: fm.title ?? "Untitled",
    description: fm.description ?? "",
    category,
    technology,
    difficulty,
    type,
    locale,
  };
}

/** Splits a content path into its segments. */
export function splitContentPath(
  contentPath: string
): {
  category: Category;
  technology: Technology;
  typeDir: TypeDir;
  slug: string;
} | null {
  const parts = contentPath.split("/");
  if (parts.length !== 4) return null;
  const [category, technology, typeDir, file] = parts;
  if (!CATEGORIES.includes(category as Category)) return null;
  if (!TECHNOLOGIES.includes(technology as Technology)) return null;
  if (!(typeDir in DIR_TO_TYPE)) return null;
  const slug = file.endsWith("_id.md")
    ? file.slice(0, -"_id.md".length)
    : file.endsWith(".md")
      ? file.slice(0, -".md".length)
      : file;
  return { category: category as Category, technology: technology as Technology, typeDir: typeDir as TypeDir, slug };
}

// --- Topic assembly ------------------------------------------------------

export interface TopicLoader {
  listPaths(): Promise<string[]>;
  fetchFile(path: string): Promise<string>;
}

/** Assembles Topic[] from a source (used by both server queries and the snapshot script). */
export async function loadTopics(loader: TopicLoader): Promise<Topic[]> {
  const paths = await loader.listPaths();
  const bySlug = new Map<string, Topic>();

  for (const contentPath of paths) {
    const seg = splitContentPath(contentPath);
    if (!seg) continue;
    const locale: Locale = contentPath.endsWith("_id.md") ? "id" : "en";
    let raw: string;
    try {
      raw = await loader.fetchFile(contentPath);
    } catch {
      // A single missing/unfetchable file must not break the whole index.
      continue;
    }
    const { frontmatter, body } = parseFrontmatter(raw);
    const file: ContentFile = {
      path: contentPath,
      slug: seg.slug,
      category: seg.category,
      technology: seg.technology,
      typeDir: seg.typeDir,
      frontmatter,
      body,
    };

    const key = `${seg.category}/${seg.technology}/${seg.typeDir}/${seg.slug}`;
    const existing = bySlug.get(key);
    if (existing) {
      existing[locale] = file;
    } else {
      bySlug.set(key, {
        slug: seg.slug,
        category: seg.category,
        technology: seg.technology,
        type: DIR_TO_TYPE[seg.typeDir],
        difficulty: file.frontmatter.difficulty,
        title: file.frontmatter.title,
        [locale]: file,
      });
    }
  }

  const topics = [...bySlug.values()];
  // Canonical title: prefer EN, fall back to ID.
  for (const t of topics) {
    t.title = t.en?.frontmatter.title ?? t.id?.frontmatter.title ?? t.slug;
  }
  return topics;
}

// --- Queries --------------------------------------------------------------

/** getTopics with a stable sort: category order → technology order → type → title. */
export function sortTopics(topics: Topic[]): Topic[] {
  const catIdx = new Map(CATEGORIES.map((c, i) => [c, i]));
  const techIdx = new Map(TECHNOLOGIES.map((t, i) => [t, i]));
  const typeIdx = new Map<ContentType, number>([
    ["tutorial", 0],
    ["cheatsheet", 1],
    ["guide", 2],
    ["syllabus", 3],
  ]);
  return [...topics].sort((a, b) => {
    const c = (catIdx.get(a.category) ?? 99) - (catIdx.get(b.category) ?? 99);
    if (c !== 0) return c;
    const t = (techIdx.get(a.technology) ?? 99) - (techIdx.get(b.technology) ?? 99);
    if (t !== 0) return t;
    const ty = (typeIdx.get(a.type) ?? 99) - (typeIdx.get(b.type) ?? 99);
    if (ty !== 0) return ty;
    return a.title.localeCompare(b.title);
  });
}

/** All topics (server-cached via the underlying GitHub/local source). */
let cachedTopics: Promise<Topic[]> | null = null;
export function getTopics(): Promise<Topic[]> {
  if (!cachedTopics) {
    const source = getContentSource();
    cachedTopics = loadTopics(source).then(sortTopics).catch((err) => {
      console.error("[content] getTopics failed:", err);
      return [];
    });
  }
  return cachedTopics;
}

export async function getTopicByKey(
  category: string,
  technology: string,
  typeDir: string,
  slug: string
): Promise<Topic | null> {
  const topics = await getTopics();
  return (
    topics.find(
      (t) =>
        t.category === category &&
        t.technology === technology &&
        TYPE_DIR[t.type] === typeDir &&
        t.slug === slug
    ) ?? null
  );
}

export async function getSiblingTopics(
  topic: Topic
): Promise<Topic[]> {
  const topics = await getTopics();
  return topics.filter(
    (t) => t.category === topic.category && t.technology === topic.technology
  );
}
