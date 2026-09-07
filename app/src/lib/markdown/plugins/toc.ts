import type { Heading, PhrasingContent, Root, RootContent } from "mdast";
import { visit } from "unist-util-visit";
import { slugify, uniqueSlug } from "../../utils";
import type { TocGroup, TocItem } from "../../types";

/** Recursively collects visible text from heading children (strong/em/link/code/...). */
export function headingText(node: Heading): string {
  const parts: string[] = [];
  const walk = (child: RootContent | PhrasingContent): void => {
    if (child.type === "text" || child.type === "inlineCode") {
      parts.push(child.value);
      return;
    }
    if ("children" in child && Array.isArray(child.children)) {
      for (const grand of child.children as RootContent[]) walk(grand as PhrasingContent);
    }
  };
  for (const child of node.children) walk(child);
  // Concatenate directly (like hast-util-to-string), then normalize whitespace.
  return parts.join("").replace(/\s+/g, " ").trim();
}

/** Flat H2/H3 list with github-slugger-compatible deduped ids (document order). */
export function extractTocFlat(tree: Root): TocItem[] {
  const items: TocItem[] = [];
  const occurrences = new Map<string, number>();

  visit(tree, "heading", (node) => {
    if (node.depth !== 2 && node.depth !== 3) return;
    const text = headingText(node);
    if (!text) return;
    const id = uniqueSlug(slugify(text), occurrences);
    items.push({ id, text, level: node.depth as 2 | 3 });
  });

  return items;
}

/** Flattens grouped TOC back to document order (for sidebar / search). */
export function flattenToc(groups: TocGroup[]): TocItem[] {
  return groups.flatMap((g) => [g.heading, ...g.children]);
}

/** Collects heading 2/3 anchors + section groupings from a markdown tree. */
export function extractToc(tree: Root): TocGroup[] {
  const flat = extractTocFlat(tree);
  const groups: TocGroup[] = [];
  let current: TocGroup | null = null;

  for (const item of flat) {
    if (item.level === 2) {
      current = { heading: item, children: [] };
      groups.push(current);
    } else if (current) {
      current.children.push(item);
    } else {
      // Orphan H3 before any H2: keep it visible instead of dropping.
      current = { heading: item, children: [] };
      groups.push(current);
    }
  }

  return groups;
}
