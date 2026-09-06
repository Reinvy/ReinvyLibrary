import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  TECHNOLOGY_LABELS,
} from "@/lib/constants";
import { LOCALES } from "@/lib/constants";
import type { Locale } from "@/lib/types";
import { getTopics } from "@/lib/content";
import PaperCard from "@/components/ui/PaperCard";
import Badge from "@/components/ui/Badge";
import WashiTape from "@/components/ui/WashiTape";

export const revalidate = 300;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) return {};
  const dict = getDictionary(locale as Locale);
  return {
    title: dict.browse.title,
    description: dict.browse.subtitle,
  };
}

export default async function BrowsePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();
  const loc = locale as Locale;
  const dict = getDictionary(loc);

  const topics = (await getTopics()).filter((t) => (loc === "en" ? t.en : t.id));

  const byCategory = CATEGORIES.map((category) => {
    const inCategory = topics.filter((t) => t.category === category);
    const techCounts = new Map<string, number>();
    for (const t of inCategory) {
      techCounts.set(t.technology, (techCounts.get(t.technology) ?? 0) + 1);
    }
    return {
      category,
      info: CATEGORY_LABELS[category],
      count: inCategory.length,
      techs: [...techCounts.entries()].sort((a, b) => b[1] - a[1]),
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-8">
        <p className="font-hand text-sm text-ink-muted">
          <Link
            href={`/${loc}`}
            className="rounded hover:text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
          >
            {dict.nav.home}
          </Link>{" "}
          / <span className="text-terracotta">{dict.browse.title}</span>
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink">
          {dict.browse.title}
        </h1>
        <p className="mt-2 font-hand text-lg text-ink-muted">{dict.browse.subtitle}</p>
      </header>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {byCategory.map(({ category, info, count, techs }, i) => (
          <PaperCard key={category} as="article" rotate className="flex flex-col p-5">
            {i === 0 && <WashiTape />}
            <div className="flex flex-wrap gap-2">
              <Badge label={`${count} ${dict.category.count}`} tone="peach" />
            </div>
            <h2 className="mt-3 font-display text-lg font-semibold leading-snug text-ink">
              <Link
                href={`/${loc}/browse/${category}`}
                className="rounded hover:text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
              >
                {info[loc]}
              </Link>
            </h2>
            <p className="mt-2 line-clamp-2 text-sm text-ink-muted">
              {info[loc === "en" ? "subtitleEn" : "subtitleId"]}
            </p>
            {techs.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {techs.map(([tech, n]) => (
                  <Link
                    key={tech}
                    href={`/${loc}/browse/${category}/${tech}`}
                    className="rounded-full bg-sage px-3 py-1 font-hand text-xs text-ink transition hover:-rotate-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
                  >
                    {
                      TECHNOLOGY_LABELS[tech as keyof typeof TECHNOLOGY_LABELS][
                        loc
                      ]
                    }{" "}
                    · {n}
                  </Link>
                ))}
              </div>
            )}
          </PaperCard>
        ))}
      </div>
    </div>
  );
}
