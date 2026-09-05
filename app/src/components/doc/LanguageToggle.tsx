import Link from "next/link";
import type { Locale } from "@/lib/types";

interface LanguageToggleProps {
  locale: Locale;
  /** href for the OTHER language's paired file (null = no sibling) */
  otherHref: string | null;
  enLabel: string;
  idLabel: string;
}

/** EN ↔ ID pill toggle linking to the paired file. */
export default function LanguageToggle({ locale, otherHref, enLabel, idLabel }: LanguageToggleProps) {
  const missingLabel =
    locale === "en"
      ? "Indonesian version not available yet"
      : "Versi Inggris belum tersedia";
  return (
    <div
      className="inline-flex items-center rounded-full border border-line bg-card p-1 shadow-paper"
      role="group"
      aria-label="Language"
    >
      {locale === "en" ? (
        <>
          <span className="rounded-full bg-sticky px-3 py-1 font-hand text-xs text-ink">{enLabel}</span>
          {otherHref ? (
            <Link
              href={otherHref}
              className="rounded-full px-3 py-1 font-hand text-xs text-ink-muted transition hover:bg-peach hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
            >
              {idLabel}
            </Link>
          ) : (
            <span
              className="cursor-not-allowed rounded-full px-3 py-1 font-hand text-xs text-ink-muted/40"
              title={missingLabel}
              aria-disabled="true"
            >
              {idLabel}
            </span>
          )}
        </>
      ) : (
        <>
          {otherHref ? (
            <Link
              href={otherHref}
              className="rounded-full px-3 py-1 font-hand text-xs text-ink-muted transition hover:bg-peach hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
            >
              {enLabel}
            </Link>
          ) : (
            <span
              className="cursor-not-allowed rounded-full px-3 py-1 font-hand text-xs text-ink-muted/40"
              title={missingLabel}
              aria-disabled="true"
            >
              {enLabel}
            </span>
          )}
          <span className="rounded-full bg-sticky px-3 py-1 font-hand text-xs text-ink">{idLabel}</span>
        </>
      )}
    </div>
  );
}
