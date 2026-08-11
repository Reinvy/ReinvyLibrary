import type { Locale, Topic } from "@/lib/types";
import { TYPE_DIR, DIFFICULTY_LABELS, TYPE_LABELS, TECHNOLOGY_LABELS, CATEGORY_LABELS } from "@/lib/constants";
import { topicUrl, fileForLocale } from "@/lib/urls";
import PaperCard from "@/components/ui/PaperCard";
import Badge from "@/components/ui/Badge";
import WashiTape from "@/components/ui/WashiTape";

interface TopicCardProps {
  topic: Topic;
  locale: Locale;
  /** highlight the first card with a washi tape strip */
  first?: boolean;
}

/** Paper card linking to a topic document (used on index pages). */
export default function TopicCard({ topic, locale, first = false }: TopicCardProps) {
  const file = fileForLocale(topic, locale);
  const href = topicUrl(locale, topic.category, topic.technology, TYPE_DIR[topic.type], topic.slug);

  return (
    <PaperCard as="article" rotate className="flex flex-col p-5">
      {first && <WashiTape />}
      <div className="flex flex-wrap gap-2">
        <Badge label={TYPE_LABELS[topic.type][locale]} tone="peach" />
        <Badge label={DIFFICULTY_LABELS[topic.difficulty][locale]} tone="sage" />
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-ink">
        <a href={href} className="hover:text-terracotta">
          {topic.title}
        </a>
      </h3>
      <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{file.frontmatter.description}</p>
      <div className="mt-4 flex items-center gap-2">
        <Badge label={CATEGORY_LABELS[topic.category][locale]} tone="sticky" />
        <Badge label={TECHNOLOGY_LABELS[topic.technology][locale]} tone="eucalyptus" />
      </div>
    </PaperCard>
  );
}
