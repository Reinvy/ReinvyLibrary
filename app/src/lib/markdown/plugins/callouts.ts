import type { Root, BlockContent } from "mdast";
import { visit } from "unist-util-visit";

export type CalloutType = "tip" | "note" | "warning" | "caution";

const CALLOUT_RE = /^\[!(TIP|NOTE|WARNING|CAUTION)\]\s*/i;

interface CalloutNode {
  type: "callout";
  data: { hName: "div"; hProperties: { className: "callout" } };
  calloutType: CalloutType;
  children: BlockContent[];
}

/**
 * remark plugin: converts a blockquote whose first paragraph starts with
 * `[!TIP]` / `[!NOTE]` / `[!WARNING]` / `[!CAUTION]` into a `callout` node.
 */
export function remarkCallouts() {
  return (tree: Root) => {
    visit(tree, "blockquote", (node, index, parent) => {
      const first = node.children[0];
      if (!first || first.type !== "paragraph") return;
      const firstChild = first.children[0];
      if (!firstChild || firstChild.type !== "text") return;
      const match = CALLOUT_RE.exec(firstChild.value);
      if (!match) return;

      // Strip the directive marker from the first text node.
      firstChild.value = firstChild.value.replace(CALLOUT_RE, "");

      const callout: CalloutNode = {
        type: "callout" as const,
        data: {
          hName: "div",
          hProperties: { className: "callout" },
        },
        calloutType: (match[1].toLowerCase() as CalloutType),
        children: node.children as BlockContent[],
      };
      if (parent && typeof index === "number") {
        parent.children[index] = callout as never;
      }
    });
  };
}
