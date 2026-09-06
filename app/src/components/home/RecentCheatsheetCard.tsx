import Link from "next/link";
import type { Locale, Topic } from "@/lib/types";
import { TYPE_DIR } from "@/lib/constants";
import { fileForLocale, topicUrl } from "@/lib/urls";
import PaperCard from "@/components/ui/PaperCard";
import TagChip from "@/components/ui/TagChip";

export default function RecentCheatsheetCard({
  topic,
  locale,
}: {
  topic: Topic;
  locale: Locale;
}) {
  const file = fileForLocale(topic, locale);
  if (!file?.frontmatter) return null;
  const href = topicUrl(locale, topic.category, topic.technology, TYPE_DIR[topic.type], topic.slug);

  return (
    <PaperCard as="article" rotate className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <TagChip label={topic.technology} tone="sage" />
        <span className="font-hand text-xs text-ink-muted">{topic.category}</span>
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-ink">
        <Link href={href} className="rounded hover:text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60">
          {topic.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{file.frontmatter.description}</p>
    </PaperCard>
  );
}
