import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { getContentSource, GITHUB_REPO } from "@/lib/github";

export default async function Footer({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  let lastSync: string | null = null;
  try {
    const meta = await getContentSource().meta?.();
    if (meta?.pushedAt) {
      lastSync = new Date(meta.pushedAt).toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  } catch {
    /* tolerate */
  }

  return (
    <footer className="mt-16 border-t border-line bg-card">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-8 text-center">
        <p className="font-hand text-sm text-ink-muted">
          {dict.footer.syncedFrom}{" "}
          <a
            href={`https://github.com/${GITHUB_REPO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-terracotta underline underline-offset-4"
          >
            {GITHUB_REPO}
          </a>
        </p>
        {lastSync && (
          <p className="text-xs text-ink-muted/70">
            {dict.footer.lastSync}: {lastSync}
          </p>
        )}
        <p className="text-xs text-ink-muted/70">
          © {new Date().getFullYear()} ReinvyLibrary · {dict.footer.builtWith}
        </p>
        <div className="mt-2 flex gap-4">
          <Link
            href="/en"
            className="rounded-full bg-peach px-3 py-1 font-hand text-xs text-ink transition hover:rotate-1"
          >
            English
          </Link>
          <Link
            href="/id"
            className="rounded-full bg-sage px-3 py-1 font-hand text-xs text-ink transition hover:-rotate-1"
          >
            Bahasa Indonesia
          </Link>
        </div>
      </div>
    </footer>
  );
}
