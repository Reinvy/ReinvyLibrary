import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  LOCALES,
  TECHNOLOGIES,
  TECHNOLOGY_LABELS,
  TYPE_DIR,
  TYPE_LABELS,
  DIFFICULTY_LABELS,
} from "@/lib/constants";
import type { Locale, Snippet } from "@/lib/types";
import {
  getTopicByKey,
  getSiblingTopics,
} from "@/lib/content";
import { fileForLocale, siblingFile, topicUrl } from "@/lib/urls";
import { renderMarkdown } from "@/lib/markdown/render";
import { readingMinutes } from "@/lib/utils";

import SidebarNav from "@/components/doc/SidebarNav";
import DocToc from "@/components/doc/DocToc";
import LanguageToggle from "@/components/doc/LanguageToggle";
import ProgressTracker from "@/components/doc/ProgressTracker";
import CheatsheetGrid from "@/components/cheatsheet/CheatsheetGrid";
import Badge from "@/components/ui/Badge";
import TagChip from "@/components/ui/TagChip";

export const revalidate = 300;

export async function generateStaticParams() {
  // Generates all doc routes from the shared topic index (single tree fetch).
  const topics = await import("@/lib/content").then((m) => m.getTopics());
  return LOCALES.flatMap((locale) =>
    topics
      .filter((t) => (locale === "en" ? t.en : t.id))
      .map((t) => ({
        locale,
        category: t.category,
        technology: t.technology,
        type: TYPE_DIR[t.type],
        slug: t.slug,
      }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string; technology: string; type: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, category, technology, type, slug } = await params;
  if (!LOCALES.includes(locale as Locale)) return {};
  if (!CATEGORIES.includes(category as never)) return {};
  if (!TECHNOLOGIES.includes(technology as never)) return {};
  const topic = await getTopicByKey(category, technology, type, slug);
  if (!topic) return {};
  const file = fileForLocale(topic, locale as Locale);
  const other = siblingFile(topic, locale as Locale);
  const base = `/${locale}/${category}/${technology}/${type}/${slug}`;
  return {
    title: file.frontmatter.title,
    description: file.frontmatter.description,
    alternates: {
      canonical: base,
      languages: other ? { en: base.replace(/^\/(en|id)/, `/${other.frontmatter.locale}`), id: base.replace(/^\/(en|id)/, `/${other.frontmatter.locale}`) } : undefined,
    },
  };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ locale: string; category: string; technology: string; type: string; slug: string }>;
}) {
  const { locale, category, technology, type, slug } = await params;
  const loc = locale as Locale;

  if (!LOCALES.includes(loc)) notFound();
  if (!CATEGORIES.includes(category as never)) notFound();
  if (!TECHNOLOGIES.includes(technology as never)) notFound();

  const topic = await getTopicByKey(category, technology, type, slug);
  if (!topic) notFound();
  const file = fileForLocale(topic, loc);
  const other = siblingFile(topic, loc);
  const siblings = await getSiblingTopics(topic);
  const dict = getDictionary(loc);

  const { toc, body, checklists } = renderMarkdown({
    markdown: file.body,
    topicSlug: topic.slug,
    checklistsEnabled: topic.type === "syllabus",
  });

  const minutes = readingMinutes(file.body);
  const isCheatsheet = topic.type === "cheatsheet";

  const crumbs = (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 font-hand text-sm text-ink-muted">
      <a href={`/${loc}`} className="hover:text-terracotta">{dict.nav.home}</a>
      <span aria-hidden>/</span>
      <a href={`/${loc}/${category}`} className="hover:text-terracotta">
        {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS][loc]}
      </a>
      <span aria-hidden>/</span>
      <a href={`/${loc}/${category}/${technology}`} className="hover:text-terracotta">
        {TECHNOLOGY_LABELS[technology as keyof typeof TECHNOLOGY_LABELS][loc]}
      </a>
      <span aria-hidden>/</span>
      <span className="text-ink">{TYPE_LABELS[topic.type][loc]}</span>
    </nav>
  );

  const header = (
    <header className="mb-8">
      <div className="flex flex-wrap items-center gap-2">
        <Badge label={TYPE_LABELS[topic.type][loc]} tone="peach" />
        <Badge label={DIFFICULTY_LABELS[topic.difficulty][loc]} tone="sage" />
        <Badge label={TECHNOLOGY_LABELS[technology as keyof typeof TECHNOLOGY_LABELS][loc]} tone="sticky" />
        <span className="font-hand text-xs text-ink-muted">
          {minutes} {dict.doc.readingTime}
        </span>
        <span className="ml-auto">
          <LanguageToggle
            locale={loc}
            otherHref={other ? topicUrl(other.frontmatter.locale, other.category, other.technology, other.typeDir, other.slug) : null}
            enLabel={dict.doc.langEn}
            idLabel={dict.doc.langId}
          />
        </span>
      </div>
      <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
        {file.frontmatter.title}
      </h1>
      <p className="mt-3 max-w-2xl font-body text-lg text-ink-muted">
        {file.frontmatter.description}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <TagChip label={category} tone="sage" />
        <TagChip label={technology} tone="peach" />
        <TagChip label={topic.type} tone="sticky" />
      </div>
    </header>
  );

  const content = isCheatsheet ? (
    <CheatsheetGrid
      snippets={snippetsFromMarkdown(file.body, topic.slug)}
      labels={{
        filterBy: dict.cheatsheet.filterBy,
        allLanguages: dict.cheatsheet.allLanguages,
        allSections: dict.cheatsheet.allSections,
        snippets: dict.cheatsheet.snippets,
        copy: dict.cheatsheet.copy,
        copied: dict.cheatsheet.copied,
        lines: dict.cheatsheet.lines,
      }}
    />
  ) : (
    <article className="reader-prose">
      {topic.type === "syllabus" && checklists.length > 0 && (
        <ProgressTracker
          topicSlug={topic.slug}
          items={checklists}
          progressLabel={dict.doc.progress}
          ofLabel={dict.doc.of}
        />
      )}
      {body}
    </article>
  );

  // prev/next within siblings (same tech, same type order)
  const ordered = siblings.filter((s) => s.type === topic.type);
  const idx = ordered.findIndex((s) => s.slug === topic.slug);
  const prev = idx > 0 ? ordered[idx - 1] : null;
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;

  const prevNext = (prev || next) && (
    <nav aria-label="Pagination" className="mt-12 grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
      {prev ? (
        <a
          href={topicUrl(loc, prev.category, prev.technology, TYPE_DIR[prev.type], prev.slug)}
          className="group rounded-card border border-line bg-card p-4 shadow-paper transition hover:-rotate-1 hover:shadow-lift"
        >
          <p className="font-hand text-xs text-ink-muted">{dict.doc.prev}</p>
          <p className="mt-1 line-clamp-1 font-display font-semibold text-ink group-hover:text-terracotta">
            {prev.title}
          </p>
        </a>
      ) : <span />}
      {next ? (
        <a
          href={topicUrl(loc, next.category, next.technology, TYPE_DIR[next.type], next.slug)}
          className="group rounded-card border border-line bg-card p-4 text-right shadow-paper transition hover:rotate-1 hover:shadow-lift"
        >
          <p className="font-hand text-xs text-ink-muted">{dict.doc.next}</p>
          <p className="mt-1 line-clamp-1 font-display font-semibold text-ink group-hover:text-terracotta">
            {next.title}
          </p>
        </a>
      ) : <span />}
    </nav>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {crumbs}
      <div className="flex gap-8">
        <SidebarNav
          siblings={siblings}
          locale={loc}
          activeSlug={topic.slug}
          labels={{ overview: dict.doc.overview, checklists: dict.doc.checklists }}
        />
        <main className="min-w-0 flex-1">
          <div className="rounded-card border border-line bg-card p-6 shadow-paper sm:p-10">
            {header}
            {content}
            {prevNext}
          </div>
        </main>
        <aside className="hidden w-56 shrink-0 lg:block">
          <DocToc toc={toc} title={dict.doc.toc} emptyLabel={dict.doc.tocEmpty} />
        </aside>
      </div>
    </div>
  );
}

/** Extract snippets from a cheatsheet body (simple fence splitter). */
function snippetsFromMarkdown(body: string, slug: string): Snippet[] {
  const snippets: Snippet[] = [];
  const fenceRe = /```([^\n]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let order = 0;
  while ((match = fenceRe.exec(body)) !== null) {
    const info = match[1].trim();
    const language = info.split(/\s+/)[0] ?? "";
    const filenameMatch = /filename="([^"]+)"/.exec(info);
    snippets.push({
      id: `${slug}-snippet-${order}`,
      language,
      filename: filenameMatch?.[1],
      code: match[2],
      section: undefined,
      order: order++,
    });
  }
  return snippets;
}
