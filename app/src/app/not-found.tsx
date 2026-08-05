import Link from "next/link";
import { getDictionary } from "@/lib/i18n";

/** Root-level 404 (outside any locale). */
export default function NotFound() {
  const dict = getDictionary("en");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper p-8 text-center">
      <div className="washi" aria-hidden />
      <p className="font-hand text-6xl text-terracotta">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-ink">
        {dict.common.notFoundTitle}
      </h1>
      <p className="mt-2 max-w-sm text-ink-muted">{dict.common.notFoundMessage}</p>
      <Link
        href="/en"
        className="mt-6 rounded-full bg-terracotta px-5 py-2.5 font-hand text-sm text-card shadow-paper transition hover:-rotate-1"
      >
        {dict.common.backHome}
      </Link>
    </div>
  );
}
