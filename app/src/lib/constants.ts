import type {
  Category,
  ContentType,
  Difficulty,
  Locale,
  Technology,
  TypeDir,
} from "./types";

/** Mirrors scripts/validate-content.js whitelists — keep in sync. */
export const CATEGORIES: Category[] = [
  "backend",
  "frontend",
  "mobile",
  "devops",
  "database",
];

export const TECHNOLOGIES: Technology[] = [
  "expressjs",
  "elysiajs",
  "nextjs",
  "react-native",
  "flutter",
  "golang",
  "laravel",
  "docker",
  "pm2",
  "redis",
  "mongodb",
  "postgres",
  "swift",
  "kotlin",
  "kubernetes",
  "nestjs",
  "vuejs",
  "github-actions",
  "tailwindcss",
  "svelte",
  "bun",
];

export const CONTENT_TYPES: ContentType[] = [
  "tutorial",
  "cheatsheet",
  "guide",
  "syllabus",
];

export const DIFFICULTIES: Difficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
];

export const LOCALES: Locale[] = ["en", "id"];

export const TYPE_DIR: Record<ContentType, TypeDir> = {
  tutorial: "tutorials",
  cheatsheet: "cheatsheets",
  guide: "guides",
  syllabus: "syllabi",
};

export const DIR_TO_TYPE: Record<TypeDir, ContentType> = {
  tutorials: "tutorial",
  cheatsheets: "cheatsheet",
  guides: "guide",
  syllabi: "syllabus",
};

export const CATEGORY_LABELS: Record<
  Category,
  { en: string; id: string; subtitleEn: string; subtitleId: string }
> = {
  backend: {
    en: "Backend",
    id: "Backend",
    subtitleEn: "Servers, APIs, and the code that powers them.",
    subtitleId: "Server, API, dan kode yang menenaginya.",
  },
  frontend: {
    en: "Frontend",
    id: "Frontend",
    subtitleEn: "Interfaces, frameworks, and delightful user experiences.",
    subtitleId: "Antarmuka, framework, dan pengalaman pengguna yang menyenangkan.",
  },
  mobile: {
    en: "Mobile",
    id: "Mobile",
    subtitleEn: "Native and cross-platform apps in your pocket.",
    subtitleId: "Aplikasi native dan lintas platform di genggaman Anda.",
  },
  devops: {
    en: "DevOps",
    id: "DevOps",
    subtitleEn: "Shipping, scaling, and keeping systems healthy.",
    subtitleId: "Mengirim, menskalakan, dan menjaga sistem tetap sehat.",
  },
  database: {
    en: "Database",
    id: "Database",
    subtitleEn: "Storing, querying, and modeling data with care.",
    subtitleId: "Menyimpan, menanyakan, dan memodelkan data dengan cermat.",
  },
};

export const TECHNOLOGY_LABELS: Record<Technology, { en: string; id: string }> =
  {
    expressjs: { en: "Express.js", id: "Express.js" },
    elysiajs: { en: "Elysia.js", id: "Elysia.js" },
    nextjs: { en: "Next.js", id: "Next.js" },
    "react-native": { en: "React Native", id: "React Native" },
    flutter: { en: "Flutter", id: "Flutter" },
    golang: { en: "Go", id: "Go" },
    laravel: { en: "Laravel", id: "Laravel" },
    docker: { en: "Docker", id: "Docker" },
    pm2: { en: "PM2", id: "PM2" },
    redis: { en: "Redis", id: "Redis" },
    mongodb: { en: "MongoDB", id: "MongoDB" },
    postgres: { en: "PostgreSQL", id: "PostgreSQL" },
    swift: { en: "Swift", id: "Swift" },
    kotlin: { en: "Kotlin", id: "Kotlin" },
    kubernetes: { en: "Kubernetes", id: "Kubernetes" },
    nestjs: { en: "NestJS", id: "NestJS" },
    vuejs: { en: "Vue.js", id: "Vue.js" },
    "github-actions": { en: "GitHub Actions", id: "GitHub Actions" },
    tailwindcss: { en: "Tailwind CSS", id: "Tailwind CSS" },
    svelte: { en: "Svelte", id: "Svelte" },
    bun: { en: "Bun", id: "Bun" },
  };

export const TYPE_LABELS: Record<ContentType, { en: string; id: string }> = {
  tutorial: { en: "Tutorial", id: "Tutorial" },
  cheatsheet: { en: "Cheatsheet", id: "Cheatsheet" },
  guide: { en: "Guide", id: "Guide" },
  syllabus: { en: "Syllabus", id: "Silabus" },
};

export const TYPE_PLURAL_LABELS: Record<ContentType, { en: string; id: string }> =
  {
    tutorial: { en: "Tutorials", id: "Tutorial" },
    cheatsheet: { en: "Cheatsheets", id: "Cheatsheet" },
    guide: { en: "Guides", id: "Panduan" },
    syllabus: { en: "Syllabi", id: "Silabus" },
  };

export const DIFFICULTY_LABELS: Record<
  Difficulty,
  { en: string; id: string }
> = {
  beginner: { en: "Beginner", id: "Pemula" },
  intermediate: { en: "Intermediate", id: "Menengah" },
  advanced: { en: "Advanced", id: "Lanjutan" },
};

/** Display name for a category/technology in a given locale. */
export function labelFor(
  kind: "category" | "technology",
  id: string,
  locale: Locale
): string {
  if (kind === "category") {
    const c = CATEGORY_LABELS[id as Category];
    return c ? c[locale] : id;
  }
  const t = TECHNOLOGY_LABELS[id as Technology];
  return t ? t[locale] : id;
}
