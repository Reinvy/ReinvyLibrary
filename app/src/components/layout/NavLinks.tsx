"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinksProps {
  locale: string;
  labels: { home: string; categories: string; search: string };
}

/** Route-aware primary nav: active pill + aria-current + keyboard ring. */
export default function NavLinks({ locale, labels }: NavLinksProps) {
  // Segment is null on /[locale], "search"/category/tech on sub-routes.
  const segment = useSelectedLayoutSegment();

  const link = (href: string, active: boolean, children: string) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full px-3 py-1.5 font-hand text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60",
        active ? "bg-peach text-ink shadow-paper" : "text-ink-muted hover:bg-peach hover:text-ink"
      )}
    >
      {children}
    </Link>
  );

  return (
    <>
      {link(`/${locale}`, segment === null, labels.home)}
      {link(`/${locale}/browse`, segment === "browse", labels.categories)}
      {link(`/${locale}/search`, segment === "search", labels.search)}
    </>
  );
}
