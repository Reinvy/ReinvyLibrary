import "server-only";

import React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

import { remarkCallouts } from "./plugins/callouts";
import { remarkChecklists } from "./plugins/checklists";
import type { TocItem } from "../types";
import type { ChecklistItem } from "../types";
import { slugify } from "../utils";

export interface RenderOptions {
  /** raw markdown body */
  markdown: string;
  /** topic slug for checklist persistence */
  topicSlug: string;
  /** whether checklists are interactive (syllabi) */
  checklistsEnabled?: boolean;
  /** whether code blocks render (cheatsheets render snippets instead) */
  codeBlocks?: boolean;
}

export interface RenderResult {
  toc: TocItem[];
  /** React elements (RSC) for the reader body */
  body: React.ReactNode;
  /** extracted checklists (for progress tracking) */
  checklists: ChecklistItem[];
}

/**
 * Renders markdown into paper-themed React components.
 * react-markdown escapes raw HTML by default → XSS-safe by construction.
 */
export function renderMarkdown(opts: RenderOptions): RenderResult {
  const { markdown, checklistsEnabled = true } = opts;

  const toc: TocItem[] = [];
  const checklists: ChecklistItem[] = [];

  const components: Components = {
    h2: ({ children }) => {
      const text = extractText(children);
      const id = slugify(text);
      toc.push({ id, text, level: 2 });
      return (
        <h2 id={id} className="group mt-10 mb-4 scroll-mt-24 flex items-baseline gap-2">
          <span className="text-2xl font-display font-bold text-ink">{text}</span>
          <a href={`#${id}`} className="text-terracotta opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Link to section">
            #
          </a>
        </h2>
      );
    },
    h3: ({ children }) => {
      const text = extractText(children);
      const id = slugify(text);
      toc.push({ id, text, level: 3 });
      return (
        <h3 id={id} className="mt-8 mb-3 scroll-mt-24 text-xl font-display font-semibold text-ink">
          {text}
        </h3>
      );
    },
    h1: () => null, // title comes from frontmatter
    p: ({ children }) => (
      <p className="my-4 text-ink-muted leading-[1.75] text-[17px]">{children}</p>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        target={href?.startsWith("http") ? "_blank" : undefined}
        rel="noopener noreferrer"
        className="text-terracotta underline underline-offset-4 decoration-terracotta/40 hover:decoration-terracotta transition-colors"
      >
        {children}
      </a>
    ),
    ul: ({ children }) => (
      <ul className="my-4 space-y-2 list-none pl-0">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-4 space-y-2 list-none pl-0">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="flex gap-3 leading-[1.7] text-ink-muted text-[17px]">
        <span aria-hidden className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta" />
        <span>{children}</span>
      </li>
    ),
    strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
    em: ({ children }) => <em className="italic text-ink">{children}</em>,
    hr: () => <hr className="my-8 border-line" />,
    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-4 border-peach bg-peach/30 pl-4 pr-4 py-2 rounded-r-2xl text-ink-muted italic">
        {children}
      </blockquote>
    ),
    code: ({ className, children }) => {
      const isBlock = /language-/.test(className ?? "") || String(children).includes("\n");
      if (!isBlock) {
        return (
          <code className="rounded-lg bg-sage px-1.5 py-0.5 font-mono text-[0.85em] text-ink">
            {children}
          </code>
        );
      }
      return (
        <pre className="my-6 overflow-x-auto rounded-2xl bg-sage p-4 font-mono text-sm leading-relaxed text-ink">
          <code className={className}>{children}</code>
        </pre>
      );
    },
    pre: ({ children }) => <>{children}</>, // handled via code
    table: ({ children }) => (
      <div className="my-6 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[480px] border-collapse text-sm text-ink-muted">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-sage/60 text-ink font-semibold">{children}</thead>
    ),
    th: ({ children }) => (
      <th className="border-b border-line px-4 py-2.5 text-left font-semibold">{children}</th>
    ),
    td: ({ children }) => (
      <td className="border-b border-line/60 px-4 py-2.5">{children}</td>
    ),
    img: ({ src, alt }) => (
      // eslint-disable-next-line @next/next/no-img-element -- remote content images
      <img src={src} alt={alt ?? ""} loading="lazy" className="my-6 max-w-full rounded-2xl" />
    ),
    input: ({ type, checked, disabled }) => {
      if (type === "checkbox") {
        return (
          <input
            type="checkbox"
            checked={checked ?? false}
            disabled={disabled ?? true}
            className="mr-2 h-4 w-4 rounded border-line accent-eucalyptus"
          />
        );
      }
      return null;
    },
  };

  const calloutComponents = {
    div: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
      if (className === "callout") return <>{children}</>;
      return <div className={className}>{children}</div>;
    },
    ...components,
  };

  const body = (
    <ReactMarkdown
      remarkPlugins={[
        remarkGfm,
        remarkCallouts,
        ...(checklistsEnabled ? [remarkChecklists] : []),
      ]}
      rehypePlugins={[rehypeSlug]}
      components={calloutComponents}
    >
      {markdown}
    </ReactMarkdown>
  );

  return { toc, body, checklists };
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return extractText(props.children);
  }
  return "";
}
