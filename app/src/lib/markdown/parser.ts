import "server-only";

import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import type { Root } from "mdast";

import { extractSnippets } from "./plugins/snippets";
import { extractToc } from "./plugins/toc";
import { remarkChecklists } from "./plugins/checklists";
import { remarkCallouts } from "./plugins/callouts";
import { highlightCode } from "./highlight";
import type { ChecklistItem, Snippet, TocGroup } from "../types";

export interface ParsedMarkdown {
  toc: TocGroup[];
  checklists: ChecklistItem[];
  snippets: Snippet[];
  /** Async-rendered code blocks (server-side highlighted). */
  highlighted: Array<{ id: string; html: string }>;
}

const mdastCache = new Map<string, Root>();

function getMdast(markdown: string): Root {
  const cached = mdastCache.get(markdown);
  if (cached) return cached;
  const tree = fromMarkdown(markdown, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
  mdastCache.set(markdown, tree);
  return tree;
}

export function parseMarkdownSync(markdown: string): {
  toc: TocGroup[];
  snippets: Snippet[];
} {
  const tree = getMdast(markdown);
  return { toc: extractToc(tree), snippets: extractSnippets(tree) };
}

/**
 * Full parse with async shiki highlighting (used by server pages).
 * checklists are collected via the remark plugin's transform output.
 */
export async function parseMarkdown(markdown: string): Promise<ParsedMarkdown> {
  const tree = getMdast(markdown);
  const toc = extractToc(tree);

  // Apply remark transforms to a cloned tree so the source cache stays pure.
  const clone = structuredClone(tree);
  remarkCallouts()(clone);
  remarkChecklists()(clone);

  // Collect checklists from the transformed clone.
  const checklists: ChecklistItem[] = [];
  visitChecklists(clone, checklists);

  const snippets = extractSnippets(tree);
  const highlighted = await Promise.all(
    snippets.map(async (s) => ({
      id: s.id,
      html: await highlightCode(s.code, s.language),
    }))
  );

  return { toc, checklists, snippets, highlighted };
}

function visitChecklists(node: Root, out: ChecklistItem[]): void {
  for (const child of node.children) {
    const cast = child as unknown as { type?: string; items?: ChecklistItem[] };
    if (cast.type === "checklist" && cast.items) {
      out.push(...cast.items);
    }
  }
}

export { remarkCallouts, remarkChecklists, extractToc, extractSnippets };
