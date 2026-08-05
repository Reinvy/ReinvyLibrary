import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import SearchBox from "@/components/search/SearchBox";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import { getDictionary } from "@/lib/i18n";
import { LOCALES } from "@/lib/constants";
import type { Locale } from "@/lib/types";
import { buildSearchDocs } from "@/lib/search";

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
    title: dict.search.title,
    description: dict.hero.subtitle,
  };
}

export default async function SearchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();
  const dict = getDictionary(locale as Locale);

  // Build the search payload server-side and ship it to the client.
  const docs = await buildSearchDocs(locale as Locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 font-display text-3xl font-bold text-ink">
        {dict.search.title}
      </h1>
      <p className="mb-8 font-hand text-lg text-ink-muted">{dict.hero.subtitle}</p>

      <Suspense fallback={<SkeletonLoader variant="hero" />}>
        <SearchBox
          docs={docs}
          dictionary={{
            placeholder: dict.search.placeholder,
            results: dict.search.results,
            noResultsTitle: dict.search.noResultsTitle,
            noResultsMessage: dict.search.noResultsMessage,
            popularTags: dict.search.popularTags,
          }}
        />
      </Suspense>
    </div>
  );
}
