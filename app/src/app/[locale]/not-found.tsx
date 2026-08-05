import Link from "next/link";

import { LOCALES } from "@/lib/constants";
import type { Locale } from "@/lib/types";
import { getDictionary } from "@/lib/i18n";

/** Scrapbook 404 for any locale (tolerant of undefined params during prerender). */
export default async function LocaleNotFound({
  params,
}: {
  params?: Promise<{ locale: string }>;
}) {
  const p = params ? await params.catch(() => undefined) : undefined;
  const locale = p?.locale ?? "";
  const loc: Locale = LOCALES.includes(locale as Locale) ? (locale as Locale) : "en";
  const dict = getDictionary(loc);

  return (
    <div className="flex flex-col items-center justify-center bg-paper px-6 py-24 text-center">
      <div className="washi" aria-hidden />
      <p className="font-hand text-7xl text-terracotta">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-ink">
        {dict.common.notFoundTitle}
      </h1>
      <p className="mt-2 max-w-sm text-ink-muted">{dict.common.notFoundMessage}</p>
      <Link
        href={`/${loc}`}
        className="mt-6 rounded-full bg-terracotta px-5 py-2.5 font-hand text-sm text-card shadow-paper transition hover:-rotate-1"
      >
        {dict.common.backHome}
      </Link>
    </div>
  );
}
