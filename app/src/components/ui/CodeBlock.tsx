interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  /** max lines before collapsing behind a "show more" toggle */
  collapsibleAt?: number;
}

/** Sage matcha code block with optional filename + copy button. */
export default function CodeBlock({ code, language, filename, collapsibleAt = 40 }: CodeBlockProps) {
  const lineCount = code.split("\n").length;
  const collapsible = lineCount > collapsibleAt;
  const langLabel = language || "text";

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-line bg-sage">
      <div className="flex items-center justify-between border-b border-line/60 bg-sage/60 px-4 py-2">
        <div className="flex items-center gap-2">
          {filename && (
            <span className="rounded-full bg-card px-2.5 py-0.5 font-mono text-xs text-ink">
              {filename}
            </span>
          )}
          <span className="font-hand text-xs text-ink-muted">{langLabel}</span>
        </div>
        <div className="opacity-90">
          <button
            type="button"
            aria-label="Copy code"
            onClick={() => navigator.clipboard.writeText(code)}
            className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 font-hand text-sm text-ink shadow-paper transition hover:bg-sticky focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
          >
            Copy
          </button>
        </div>
      </div>
      <div className="p-4">
        {collapsible ? (
          <details className="group">
            <summary className="cursor-pointer list-none font-hand text-sm text-terracotta">
              {lineCount} lines — click to expand
            </summary>
            <pre className="mt-3 overflow-x-auto font-mono text-sm leading-relaxed text-ink">
              <code>{code}</code>
            </pre>
          </details>
        ) : (
          <pre className="overflow-x-auto font-mono text-sm leading-relaxed text-ink">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
