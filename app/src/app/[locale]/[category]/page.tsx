import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n";
import { CATEGORIES, CATEGORY_LABELS, TECHNOLOGY_LABELS } from "@/lib/constants";
import type { Locale } from "@/lib/types";
import { getTopics } from "@/lib/content";
import FilterableTopicGrid from "@/components/home/FilterableTopicGrid";

export const revalidate = 300;

export function generateStaticParams() {
  return CATEGORIES.flatMap((category) => [
    { locale: "en", category },
    { locale: "id", category },
  ]);
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}): Promise<Metadata> {
  const { locale, category } = await params;
  if (!CATEGORIES.includes(category as never)) return {};
  const dict = getDictionary(locale as Locale);
  const info = CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS];
  return {
    title: `${info[locale as "en" | "id"]} · ${dict.nav.categories}`,
    description: info[locale === "en" ? "subtitleEn" : "subtitleId"],
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = await params;
  if (!CATEGORIES.includes(category as never)) notFound();
  const dict = getDictionary(locale as Locale);
  const info = CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS];

  const topics = (await getTopics()).filter(
    (t) =>
      t.category === category &&
      (locale === "en" ? t.en : t.id)
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-8">
        <p className="font-hand text-sm text-ink-muted">
          {dict.nav.categories} / <span className="text-terracotta">{info[locale as "en" | "id"]}</span>
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink">
          {info[locale as "en" | "id"]}
        </h1>
        <p className="mt-2 font-hand text-lg text-ink-muted">
          {info[locale === "en" ? "subtitleEn" : "subtitleId"]} · {topics.length}{" "}
          {dict.category.count}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from(new Set(topics.map((t) => t.technology))).map((tech) => (
            <a
              key={tech}
              href={`/${locale}/${category}/${tech}`}
              className="rounded-full bg-sage px-3 py-1 font-hand text-xs text-ink transition hover:-rotate-1"
            >
              {TECHNOLOGY_LABELS[tech as keyof typeof TECHNOLOGY_LABELS][locale as "en" | "id"]}
            </a>
          ))}
        </div>
      </header>

      <FilterableTopicGrid
        topics={topics}
        locale={locale as Locale}
        emptyTitle={dict.category.emptyTitle}
        emptyMessage={dict.category.emptyMessage}
      />
    </div>
  );
}
