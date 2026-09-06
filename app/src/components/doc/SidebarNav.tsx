import type { Locale, Topic } from "@/lib/types";
import { TYPE_DIR, TYPE_LABELS } from "@/lib/constants";
import { topicUrl } from "@/lib/urls";
import BookmarkTab from "@/components/ui/BookmarkTab";
import SidebarDrawer from "./SidebarDrawer";

interface SidebarNavProps {
  siblings: Topic[];
  locale: Locale;
  activeSlug: string;
  /** localized chrome labels */
  labels: { overview: string; checklists: string };
}

/**
 * Bookmark-tab sidebar navigation. Server-rendered desktop sidebar +
 * client drawer island for mobile (keyboard accessible, Escape closes,
 * focus moves in/out).
 */
export default function SidebarNav({ siblings, locale, activeSlug, labels }: SidebarNavProps) {
  const tabs = siblings.map((t) => ({
    href: topicUrl(locale, t.category, t.technology, TYPE_DIR[t.type], t.slug),
    label: t.title,
    active: t.slug === activeSlug,
    typeLabel: TYPE_LABELS[t.type][locale],
  }));

  return (
    <>
      {/* Desktop sidebar (sticky, always visible) */}
      <aside className="sticky top-24 hidden max-h-[calc(100vh-8rem)] w-56 shrink-0 overflow-y-auto lg:block">
        <p className="mb-2 font-hand text-sm text-ink-muted">{labels.overview}</p>
        <div className="space-y-1.5">
          {tabs.map((tab) => (
            <BookmarkTab
              key={tab.href}
              href={tab.href}
              label={tab.label}
              active={tab.active}
              rotate
            />
          ))}
        </div>
      </aside>

      {/* Mobile: trigger + slide-over drawer (client island) */}
      <SidebarDrawer
        tabs={tabs}
        overviewLabel={labels.overview}
        closeLabel={locale === "id" ? "Tutup" : "Close"}
      />
    </>
  );
}
