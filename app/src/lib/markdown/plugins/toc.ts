import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import { slugify } from "../../utils";
import type { TocGroup, TocItem } from "../../types";

/** Collects heading 2/3 anchors + section groupings from a markdown tree. */
export function extractToc(tree: Root): TocGroup[] {
  const groups: TocGroup[] = [];
  let current: TocGroup | null = null;

  visit(tree, "heading", (node) => {
    if (node.depth !== 2 && node.depth !== 3) return;
    const text = node.children
      .filter((c) => c.type === "text" || c.type === "inlineCode")
      .map((c) => (c.type === "text" ? c.value : c.value))
      .join(" ")
      .trim();
    if (!text) return;
    const item: TocItem = { id: slugify(text), text, level: node.depth as 2 | 3 };
    if (node.depth === 2) {
      current = { heading: item, children: [] };
      groups.push(current);
    } else if (current) {
      current.children.push(item);
    }
  });

  return groups;
}
