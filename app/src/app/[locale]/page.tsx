import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n";
import { CATEGORIES, CATEGORY_LABELS, LOCALES, TECHNOLOGY_LABELS } from "@/lib/constants";
import type { Locale } from "@/lib/types";
import { getTopics, sortTopics } from "@/lib/content";

import HeroSearch from "@/components/home/HeroSearch";
import BentoGrid from "@/components/home/BentoGrid";
import FeaturedTutorialCard from "@/components/home/FeaturedTutorialCard";
import RecentCheatsheetCard from "@/components/home/RecentCheatsheetCard";
import SyllabusProgressCard from "@/components/home/SyllabusProgressCard";
import TopicCard from "@/components/home/TopicCard";
import PaperCard from "@/components/ui/PaperCard";
import WashiTape from "@/components/ui/WashiTape";
import SectionHeading from "@/components/ui/SectionHeading";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) return {};
  const dict = getDictionary(locale as Locale);
  return {
    title: dict.hero.title,
    description: dict.hero.subtitle,
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();
  const loc = locale as Locale;
  const dict = getDictionary(loc);

  // Single index read, everything derived in-memory — filtered by locale first
  // so /id never showcases content with no Indonesian file.
  const sorted = sortTopics(await getTopics());
  const topicsHere = sorted.filter((t) => (loc === "en" ? t.en : t.id));
  const categoryCount = new Set(topicsHere.map((t) => t.category)).size;

  const featured = topicsHere.find((t) => t.type === "tutorial") ?? null;
  const cheatsheets = topicsHere.filter((t) => t.type === "cheatsheet").slice(0, 2);
  const syllabi = topicsHere.filter((t) => t.type === "syllabus");
  const latest = topicsHere
    .filter((t) => (t.type === "guide" || t.type === "tutorial") && t.slug !== featured?.slug)
    .slice(0, 3);

  const techCounts = new Map<string, { count: number; category: string }>();
  for (const t of topicsHere) {
    const prev = techCounts.get(t.technology);
    if (prev) prev.count += 1;
    else techCounts.set(t.technology, { count: 1, category: t.category });
  }
  const popularTech = [...techCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8);

  const stats = (
    <PaperCard className="flex h-full flex-col justify-center p-6">
      <WashiTape />
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="font-display text-3xl font-bold text-terracotta">{topicsHere.length}</p>
          <p className="font-hand text-xs text-ink-muted">{dict.hero.statsTopics}</p>
        </div>
        <div>
          <p className="font-display text-3xl font-bold text-eucalyptus">{categoryCount}</p>
          <p className="font-hand text-xs text-ink-muted">{dict.hero.statsCategories}</p>
        </div>
        <div>
          <p className="font-display text-3xl font-bold text-ink">2</p>
          <p className="font-hand text-xs text-ink-muted">{dict.hero.statsLanguages}</p>
        </div>
      </div>
    </PaperCard>
  );

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* Hero */}
      <section className="py-16 text-center">
        <p className="mx-auto inline-block rounded-full bg-peach px-4 py-1.5 font-hand text-sm text-ink shadow-paper">
          ✦ {dict.hero.badge}
        </p>
        <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">
          {dict.hero.title}
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-hand text-lg text-ink-muted">
          {dict.hero.subtitle}
        </p>
        <HeroSearch
          placeholder={dict.hero.searchPlaceholder}
          buttonLabel={dict.hero.searchButton}
          locale={locale}
        />
        <div className="mx-auto mt-4 flex max-w-xl flex-wrap items-center justify-center gap-2">
          <span className="font-hand text-sm text-ink-muted">{dict.search.popularTags}:</span>
          {popularTech.slice(0, 5).map(([tech]) => (
            <Link
              key={tech}
              href={`/${loc}/search?q=${encodeURIComponent(tech)}`}
              className="rounded-full bg-peach/60 px-3 py-1 font-hand text-xs text-ink transition hover:bg-peach focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
            >
              {tech}
            </Link>
          ))}
          <Link
            href={`/${loc}/browse`}
            className="rounded-full border border-line bg-card px-3 py-1 font-hand text-xs text-ink-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
          >
            {dict.nav.categories} →
          </Link>
        </div>
      </section>

      {/* Highlights bento */}
      <section className="pb-4">
        <SectionHeading>{dict.home.highlights}</SectionHeading>
        <BentoGrid
          featured={
            featured ? (
              <FeaturedTutorialCard topic={featured} locale={loc} readMore={dict.home.readMore} />
            ) : (
              <PaperCard className="p-6">
                <p className="font-hand text-ink-muted">{dict.category.emptyMessage}</p>
              </PaperCard>
            )
          }
          recent={cheatsheets.map((c) => ({
            slug: c.slug,
            card: <RecentCheatsheetCard topic={c} locale={loc} />,
          }))}
          recentFallback={
            <PaperCard className="flex h-full flex-col justify-center p-5">
              <p className="font-hand text-sm text-ink-muted">{dict.category.emptyMessage}</p>
              <Link
                href={`/${loc}/browse`}
                className="mt-3 inline-block font-hand text-sm text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
              >
                {dict.home.viewAll} →
              </Link>
            </PaperCard>
          }
          progress={
            <SyllabusProgressCard
              syllabi={syllabi}
              locale={loc}
              title={dict.home.syllabusProgress}
              emptyLabel={dict.home.syllabusProgressEmpty}
              ctaLabel={dict.home.syllabusProgressCta}
            />
          }
          stats={stats}
        />
      </section>

      {/* Category shelf */}
      <section className="pb-4">
        <div className="flex items-end justify-between gap-4">
          <SectionHeading>{dict.home.categoriesTitle}</SectionHeading>
          <Link
            href={`/${loc}/browse`}
            className="mb-4 shrink-0 rounded-full font-hand text-sm text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
          >
            {dict.home.viewAll} →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((category, i) => {
            const info = CATEGORY_LABELS[category];
            const count = topicsHere.filter((t) => t.category === category).length;
            return (
              <PaperCard key={category} as="article" rotate className="flex flex-col p-5">
                {i === 0 && <WashiTape />}
                <p className="font-hand text-xs text-ink-muted">
                  {count} {dict.category.count}
                </p>
                <h3 className="mt-1 font-display text-lg font-semibold text-ink">
                  <Link
                    href={`/${loc}/browse/${category}`}
                    className="rounded hover:text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
                  >
                    {info[loc]}
                  </Link>
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                  {info[loc === "en" ? "subtitleEn" : "subtitleId"]}
                </p>
              </PaperCard>
            );
          })}
        </div>
      </section>

      {/* Popular technologies */}
      {popularTech.length > 0 && (
        <section className="pb-4">
          <SectionHeading>{dict.home.popularTech}</SectionHeading>
          <div className="flex flex-wrap gap-2">
            {popularTech.map(([tech, { count, category }]) => (
              <Link
                key={tech}
                href={`/${loc}/browse/${category}/${tech}`}
                className="rounded-full bg-sage px-4 py-1.5 font-hand text-sm text-ink shadow-paper transition hover:-rotate-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
              >
                {TECHNOLOGY_LABELS[tech as keyof typeof TECHNOLOGY_LABELS]?.[loc] ?? tech}{" "}
                <span className="text-ink-muted">· {count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Latest guides & tutorials */}
      {latest.length > 0 && (
        <section className="pb-16">
          <div className="flex items-end justify-between gap-4">
            <SectionHeading>{dict.home.latestGuides}</SectionHeading>
            <Link
              href={`/${loc}/browse`}
              className="mb-4 shrink-0 rounded-full font-hand text-sm text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
            >
              {dict.home.viewAll} →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((t) => (
              <TopicCard key={`${t.slug}-${t.type}`} topic={t} locale={loc} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
