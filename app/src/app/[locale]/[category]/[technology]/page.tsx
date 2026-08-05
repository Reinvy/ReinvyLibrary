import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n";
import { CATEGORIES, CATEGORY_LABELS, TECHNOLOGIES, TECHNOLOGY_LABELS } from "@/lib/constants";
import type { Locale } from "@/lib/types";
import { getTopics } from "@/lib/content";
import FilterableTopicGrid from "@/components/home/FilterableTopicGrid";

export const revalidate = 300;

export function generateStaticParams() {
  return CATEGORIES.flatMap((category) =>
    TECHNOLOGIES.flatMap((technology) => [
      { locale: "en", category, technology },
      { locale: "id", category, technology },
    ])
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string; technology: string }>;
}): Promise<Metadata> {
  const { locale, category, technology } = await params;
  if (!CATEGORIES.includes(category as never)) return {};
  if (!TECHNOLOGIES.includes(technology as never)) return {};
  const cat = CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS];
  const tech = TECHNOLOGY_LABELS[technology as keyof typeof TECHNOLOGY_LABELS];
  return {
    title: `${tech[locale as "en" | "id"]} · ${cat[locale as "en" | "id"]}`,
    description: `${tech[locale as "en" | "id"]} topics in ${cat[locale as "en" | "id"]}.`,
  };
}

export default async function TechnologyPage({
  params,
}: {
  params: Promise<{ locale: string; category: string; technology: string }>;
}) {
  const { locale, category, technology } = await params;
  if (!CATEGORIES.includes(category as never)) notFound();
  if (!TECHNOLOGIES.includes(technology as never)) notFound();
  const dict = getDictionary(locale as Locale);
  const cat = CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS];
  const tech = TECHNOLOGY_LABELS[technology as keyof typeof TECHNOLOGY_LABELS];

  const topics = (await getTopics()).filter(
    (t) =>
      t.category === category &&
      t.technology === technology &&
      (locale === "en" ? t.en : t.id)
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-8">
        <p className="font-hand text-sm text-ink-muted">
          {dict.nav.categories} /{" "}
          <a href={`/${locale}/${category}`} className="hover:text-terracotta">
            {cat[locale as "en" | "id"]}
          </a>{" "}
          / <span className="text-terracotta">{tech[locale as "en" | "id"]}</span>
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink">
          {tech[locale as "en" | "id"]}
        </h1>
        <p className="mt-2 font-hand text-lg text-ink-muted">
          {topics.length} {dict.category.count} · {cat[locale as "en" | "id"]}
        </p>
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
