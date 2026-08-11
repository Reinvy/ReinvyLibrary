import "server-only";

import { createHighlighter, type Highlighter } from "shiki";

// Single highlighter instance, built once per process (RSC-safe).
let highlighterPromise: Promise<Highlighter> | null = null;

export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light"],
      langs: [
        "bash",
        "sql",
        "javascript",
        "typescript",
        "tsx",
        "jsx",
        "json",
        "python",
        "go",
        "rust",
        "docker",
        "yaml",
        "toml",
        "ini",
        "markdown",
        "css",
        "scss",
        "html",
        "xml",
        "java",
        "kotlin",
        "swift",
        "dart",
        "php",
        "c",
        "cpp",
        "ruby",
        "shell",
        "powershell",
        "graphql",
        "plaintext",
      ],
    });
  }
  return highlighterPromise;
}

/**
 * Highlights code server-side. Falls back to plain (escaped) HTML when the
 * language is unknown or highlighting fails — never throws.
 */
export async function highlightCode(
  code: string,
  language?: string
): Promise<string> {
  try {
    const hl = await getHighlighter();
    const lang = (language && hl.getLoadedLanguages().includes(language)) ? language : "text";
    return hl.codeToHtml(code, { lang, theme: "github-light" });
  } catch {
    return `<pre class="shiki plain"><code>${escapeHtml(code)}</code></pre>`;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
