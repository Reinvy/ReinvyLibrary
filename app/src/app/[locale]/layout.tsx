import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense } from "react";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ProgressProvider } from "@/components/providers/ProgressProvider";
import { GamificationProvider } from "@/components/providers/GamificationProvider";
import AchievementToast from "@/components/gamification/AchievementToast";
import { getDictionary } from "@/lib/i18n";
import { LOCALES, TYPE_LABELS, DIFFICULTY_LABELS } from "@/lib/constants";
import type { Locale } from "@/lib/types";
import { getTopics } from "@/lib/content";

const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  id: "Bahasa Indonesia",
};

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
    title: locale === "en" ? undefined : "ReinvyLibrary — sudut internet yang hangat",
    description: dict.hero.subtitle,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        id: "/id",
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();
  const loc = locale as Locale;
  const dict = getDictionary(loc);

  return (
    <div className="flex min-h-screen flex-col">
      <ProgressProvider>
        <GamificationProvider>
          <Header locale={loc} />
          <main className="flex-1">{children}</main>
          <Suspense fallback={null}>
            <Footer locale={loc} />
          </Suspense>
          <AchievementToast
            locale={loc}
            labels={{
              badgeUnlocked: dict.game.toastBadge,
              levelUp: dict.game.toastLevel,
              questDone: dict.game.toastQuest,
              freezeUsed: dict.game.toastFreeze,
              syllabusDone: dict.game.toastSyllabus,
              xpSuffix: dict.game.xp,
            }}
          />
        </GamificationProvider>
      </ProgressProvider>
      <Suspense fallback={null}>
        <HeaderCount locale={locale as Locale} />
      </Suspense>
    </div>
  );
}

/** Non-blocking locale topic count for screen readers (streams after shell). */
async function HeaderCount({ locale }: { locale: Locale }) {
  const topics = await getTopics();
  const count = topics.filter((t) => (locale === "en" ? t.en : t.id)).length;
  return (
    <span className="sr-only">
      {LOCALE_NAMES[locale]} · {count} topics · {TYPE_LABELS.tutorial.en}/
      {TYPE_LABELS.cheatsheet.en}/{TYPE_LABELS.guide.en}/{TYPE_LABELS.syllabus.en} ·{" "}
      {DIFFICULTY_LABELS.beginner.en}/{DIFFICULTY_LABELS.intermediate.en}/
      {DIFFICULTY_LABELS.advanced.en}
    </span>
  );
}
