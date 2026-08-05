import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import type { Snippet } from "../../types";

interface Meta {
  filename?: string;
  language?: string;
}

/** Parses info-string meta like ` ```js filename="server.js" `. */
function parseMeta(info: string): Meta {
  const trimmed = info.trim();
  if (!trimmed) return {};
  const parts = trimmed.split(/\s+/);
  const language = parts[0] || undefined;
  const filenameMatch = /filename="([^"]+)"/.exec(trimmed);
  return { language, filename: filenameMatch?.[1] };
}

/** Extracts fenced code blocks with language + filename + section context. */
export function extractSnippets(tree: Root, fallbackLanguage = ""): Snippet[] {
  const snippets: Snippet[] = [];
  let currentSection: string | undefined;

  visit(tree, (node) => {
    if (node.type === "heading" && node.depth === 2) {
      currentSection = node.children
        .filter((c) => c.type === "text" || c.type === "inlineCode")
        .map((c) => (c.type === "text" ? c.value : c.value))
        .join(" ")
        .trim();
      return;
    }
    if (node.type !== "code") return;
    const meta = parseMeta(node.lang ?? "");
    snippets.push({
      id: `snippet-${snippets.length}`,
      language: meta.language ?? fallbackLanguage,
      filename: meta.filename,
      code: node.value,
      section: currentSection,
      order: snippets.length,
    });
  });

  return snippets;
}
