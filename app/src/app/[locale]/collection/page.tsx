import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n";
import { LOCALES } from "@/lib/constants";
import type { Locale } from "@/lib/types";

import SectionHeading from "@/components/ui/SectionHeading";
import OwiMascot from "@/components/gamification/OwiMascot";
import BadgeGrid from "@/components/gamification/BadgeGrid";
import StampBook from "@/components/gamification/StampBook";
import ContinueLearningCard from "@/components/gamification/ContinueLearningCard";
import ShareCardButton from "@/components/gamification/ShareCardButton";
import DataManager from "@/components/gamification/DataManager";

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
    title: dict.game.collectionTitle,
    description: dict.game.collectionSubtitle,
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();
  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const g = dict.game;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex items-start gap-4">
        <OwiMascot mood="celebrate" size={64} />
        <div>
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">{g.collectionTitle}</h1>
          <p className="mt-2 max-w-2xl font-hand text-base text-ink-muted">{g.collectionSubtitle}</p>
          <div className="mt-3">
            <ShareCardButton
              locale={loc}
              title={g.collectionTitle}
              tagline={g.shareTagline}
              downloadLabel={g.shareDownload}
              shareLabel={g.shareButton}
              sharedLabel={g.shareDone}
            />
          </div>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ContinueLearningCard
            locale={loc}
            title={g.shelf}
            continueLabel={g.continueReading}
            shelfLabel={g.shelf}
            emptyHistory={g.historyEmpty}
            emptyBookmarks={g.shelfEmpty}
            browseLabel={g.browseMore}
            removeLabel={g.removeBookmark}
            browseHref={`/${loc}/browse`}
          />
        </div>
        <div>
          <DataManager
            labels={{
              title: g.dataTitle,
              description: g.dataDescription,
              export: g.dataExport,
              import: g.dataImport,
              reset: g.dataReset,
              resetConfirm: g.dataResetConfirm,
              resetCancel: g.dataResetCancel,
              importOk: g.dataImportOk,
              importFail: g.dataImportFail,
            }}
          />
        </div>
      </div>

      <div className="mt-10">
        <SectionHeading>{g.badges}</SectionHeading>
        <BadgeGrid
          locale={loc}
          title={g.badges}
          unlockedLabel={g.badgesUnlocked}
          lockedLabel={g.badgeLocked}
        />
      </div>

      <div className="mt-10 pb-8">
        <SectionHeading>{g.stamps}</SectionHeading>
        <StampBook
          locale={loc}
          title={g.stamps}
          collectedLabel={g.stampsCollected}
          lockedLabel={g.stampLocked}
        />
      </div>
    </div>
  );
}
