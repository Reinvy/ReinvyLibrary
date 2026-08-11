import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n";
import { LOCALES } from "@/lib/constants";
import type { Locale } from "@/lib/types";
import { getTopics } from "@/lib/content";
import { getFeaturedTutorial, getRecentCheatsheets, getSyllabi } from "@/lib/featured";

import HeroSearch from "@/components/home/HeroSearch";
import BentoGrid from "@/components/home/BentoGrid";
import FeaturedTutorialCard from "@/components/home/FeaturedTutorialCard";
import RecentCheatsheetCard from "@/components/home/RecentCheatsheetCard";
import SyllabusProgressCard from "@/components/home/SyllabusProgressCard";
import PaperCard from "@/components/ui/PaperCard";
import WashiTape from "@/components/ui/WashiTape";

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
  const dict = getDictionary(locale as Locale);

  const topics = await getTopics();
  const topicsHere = topics.filter((t) => (locale === "en" ? t.en : t.id));
  const categories = new Set(topics.map((t) => t.category)).size;

  const featured = await getFeaturedTutorial();
  const cheatsheets = await getRecentCheatsheets(locale as Locale, 2);
  const syllabi = await getSyllabi();

  const stats = (
    <PaperCard className="flex h-full flex-col justify-center p-6">
      <WashiTape />
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="font-display text-3xl font-bold text-terracotta">{topicsHere.length}</p>
          <p className="font-hand text-xs text-ink-muted">{dict.hero.statsTopics}</p>
        </div>
        <div>
          <p className="font-display text-3xl font-bold text-eucalyptus">{categories}</p>
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
      </section>

      {/* Bento */}
      <section id="categories" className="pb-16">
        <h2 className="mb-6 font-display text-2xl font-bold text-ink">
          {dict.home.featured}
        </h2>
        <BentoGrid
          featured={
            featured ? (
              <FeaturedTutorialCard topic={featured} locale={locale as Locale} />
            ) : (
              <PaperCard className="p-6">
                <p className="font-hand text-ink-muted">{dict.category.emptyMessage}</p>
              </PaperCard>
            )
          }
          recent={cheatsheets.map((c) => (
            <RecentCheatsheetCard key={c.slug} topic={c} locale={locale as Locale} />
          ))}
          progress={
            <SyllabusProgressCard
              syllabi={syllabi}
              locale={locale as Locale}
              emptyLabel={dict.home.syllabusProgressEmpty}
              ctaLabel={dict.home.syllabusProgressCta}
            />
          }
          stats={stats}
        />
      </section>
    </div>
  );
}
