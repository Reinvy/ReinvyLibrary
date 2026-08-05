export type Locale = "en" | "id";

export type Category =
  | "backend"
  | "frontend"
  | "mobile"
  | "devops"
  | "database";

export type Technology =
  | "expressjs"
  | "elysiajs"
  | "nextjs"
  | "react-native"
  | "flutter"
  | "golang"
  | "laravel"
  | "docker"
  | "pm2"
  | "redis"
  | "mongodb"
  | "postgres"
  | "swift"
  | "kotlin"
  | "kubernetes"
  | "nestjs"
  | "vuejs"
  | "github-actions"
  | "tailwindcss"
  | "svelte"
  | "bun";

export type ContentType = "tutorial" | "cheatsheet" | "guide" | "syllabus";

export type TypeDir = "tutorials" | "cheatsheets" | "guides" | "syllabi";

export type Difficulty = "beginner" | "intermediate" | "advanced";

/** Exactly the 8 fields the repo's validator enforces. */
export interface Frontmatter {
  title: string;
  description: string;
  category: Category;
  technology: Technology;
  difficulty: Difficulty;
  type: ContentType;
  locale: Locale;
}

/** A single markdown file from the content repo. */
export interface ContentFile {
  /** e.g. `frontend/nextjs/tutorials/building-x.md` */
  path: string;
  /** base name without extension / locale suffix, e.g. `building-x` */
  slug: string;
  category: Category;
  technology: Technology;
  typeDir: TypeDir;
  frontmatter: Frontmatter;
  /** raw markdown body (frontmatter stripped) */
  body: string;
}

/** A bilingual topic: one slug, up to two locale files. */
export interface Topic {
  slug: string;
  category: Category;
  technology: Technology;
  type: ContentType;
  difficulty: Difficulty;
  /** canonical English title, falling back to the Indonesian title */
  title: string;
  en?: ContentFile;
  id?: ContentFile;
}

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface TocGroup {
  heading: TocItem;
  children: TocItem[];
}

/** A fenced code block extracted from a document (used by the cheatsheet view). */
export interface Snippet {
  id: string;
  language: string;
  filename?: string;
  code: string;
  section?: string;
  order: number;
}

/** A checklist item extracted from a GFM task list. */
export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

/** Searchable document payload (serialized into the search page). */
export interface SearchDoc {
  id: string;
  locale: Locale;
  path: string;
  title: string;
  description: string;
  tags: string[];
  headings: string[];
  bodySnippet: string;
  category: Category;
  technology: Technology;
  type: ContentType;
  difficulty: Difficulty;
}

/** Everything a document route needs to render. */
export interface DocPageData {
  topic: Topic;
  file: ContentFile;
  /** paired locale file, when it exists */
  sibling: ContentFile | null;
  toc: TocGroup[];
  /** full rendered markdown as React elements (RSC) */
  body: React.ReactNode;
  /** extracted snippets — only set for cheatsheets */
  snippets?: Snippet[];
  /** other topics in the same category+technology, for sidebar nav */
  siblings: Topic[];
  readingMinutes: number;
}

export interface CategoryInfo {
  id: Category;
  /** localized display name */
  labelEn: string;
  labelId: string;
}

export interface TechnologyInfo {
  id: Technology;
  labelEn: string;
  labelId: string;
}
