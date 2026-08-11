import "server-only";

import type { Locale, SearchDoc } from "./types";
import { getTopics } from "./content";
import { fileForLocale } from "./urls";
import { deriveTags } from "./utils";
import { parseMarkdownSync } from "./markdown/parser";

const BODY_PREVIEW_LEN = 2000;

function plainText(markdown: string): string {
  return markdown
    .replace(/^---[\s\S]*?---/, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~\-|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Builds the search payload for a locale from the topic index (server-side). */
export async function buildSearchDocs(locale: Locale): Promise<SearchDoc[]> {
  const topics = await getTopics();
  const docs: SearchDoc[] = [];

  for (const topic of topics) {
    const file = fileForLocale(topic, locale);
    const body = plainText(file.body);
    const { toc } = parseMarkdownSync(file.body);
    const headings = toc.map((g) => [g.heading.text, ...g.children.map((c) => c.text)]).flat();
    docs.push({
      id: `${locale}:${file.path}`,
      locale,
      path: file.path,
      title: file.frontmatter.title,
      description: file.frontmatter.description,
      tags: deriveTags({
        category: file.category,
        technology: file.technology,
        type: topic.type,
        difficulty: topic.difficulty,
      }),
      headings,
      bodySnippet: body.slice(0, BODY_PREVIEW_LEN),
      category: file.category,
      technology: file.technology,
      type: topic.type,
      difficulty: topic.difficulty,
    });
  }

  return docs;
}
