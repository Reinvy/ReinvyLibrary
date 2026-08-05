import Link from "next/link";
import type { Locale, Topic } from "@/lib/types";
import { TYPE_DIR, DIFFICULTY_LABELS, TYPE_LABELS } from "@/lib/constants";
import { topicUrl } from "@/lib/urls";
import Badge from "@/components/ui/Badge";
import PaperCard from "@/components/ui/PaperCard";
import WashiTape from "@/components/ui/WashiTape";

export default function FeaturedTutorialCard({
  topic,
  locale,
}: {
  topic: Topic;
  locale: Locale;
}) {
  const file = topic.en ?? topic.id;
  if (!file) return null;
  const href = topicUrl(locale, topic.category, topic.technology, TYPE_DIR[topic.type], topic.slug);

  return (
    <PaperCard
      as="article"
      rotate
      className="col-span-2 row-span-2 flex flex-col p-6"
    >
      <WashiTape />
      <div className="flex flex-wrap gap-2">
        <Badge label={TYPE_LABELS[topic.type][locale]} tone="peach" />
        <Badge label={DIFFICULTY_LABELS[topic.difficulty][locale]} tone="sage" />
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold leading-snug text-ink">
        <Link href={href} className="hover:text-terracotta">
          {topic.title}
        </Link>
      </h2>
      <p className="mt-3 line-clamp-3 text-ink-muted">{file.frontmatter.description}</p>
      <div className="mt-auto pt-4">
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 rounded-full bg-sticky px-4 py-2 font-hand text-sm text-ink shadow-paper transition hover:rotate-1"
        >
          Read
          <svg aria-hidden className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </PaperCard>
  );
}
