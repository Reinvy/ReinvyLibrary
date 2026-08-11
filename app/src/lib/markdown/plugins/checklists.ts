import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import type { ChecklistItem } from "../../types";
import { slugify } from "../../utils";

/**
 * remark plugin: collects GFM task-list checklists (used for syllabus
 * progress tracking). Each task-list is emitted as a `checklist` node.
 */
export function remarkChecklists() {
  return (tree: Root) => {
    visit(tree, "list", (node, index, parent) => {
      if (!node.ordered || node.children.length === 0) return;
      const isTask = node.children.every(
        (item) =>
          item.type === "listItem" &&
          item.children[0] &&
          item.children[0].type === "paragraph" &&
          "checked" in item &&
          (item.checked === true || item.checked === false)
      );
      if (!isTask) return;

      const items: ChecklistItem[] = node.children.map((item, i) => {
        const para = item.children[0] as import("mdast").Paragraph;
        const label = para.children
          .map((c) => (c.type === "text" || c.type === "inlineCode" ? c.value : ""))
          .join(" ")
          .trim();
        return {
          id: `${slugify(label) || "item"}-${i}`,
          label,
          checked: item.checked === true,
        };
      });

      const checklistNode = {
        type: "checklist" as const,
        data: { hName: "div", hProperties: { className: "checklist" } },
        items,
      };
      if (parent && typeof index === "number") {
        parent.children[index] = checklistNode as never;
      }
    });
  };
}
