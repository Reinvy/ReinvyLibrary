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
            <a
              href={otherHref}
              className="rounded-full px-3 py-1 font-hand text-xs text-ink-muted transition hover:bg-peach hover:text-ink"
            >
              {idLabel}
            </a>
          ) : (
            <span className="cursor-not-allowed rounded-full px-3 py-1 font-hand text-xs text-ink-muted/40">
              {idLabel}
            </span>
          )}
        </>
      ) : (
        <>
          {otherHref ? (
            <a
              href={otherHref}
              className="rounded-full px-3 py-1 font-hand text-xs text-ink-muted transition hover:bg-peach hover:text-ink"
            >
              {enLabel}
            </a>
          ) : (
            <span className="cursor-not-allowed rounded-full px-3 py-1 font-hand text-xs text-ink-muted/40">
              {enLabel}
            </span>
          )}
          <span className="rounded-full bg-sticky px-3 py-1 font-hand text-xs text-ink">{idLabel}</span>
        </>
      )}
    </div>
  );
}
