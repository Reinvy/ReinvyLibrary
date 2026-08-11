"use client";

import { useState } from "react";
import type { Snippet } from "@/lib/types";
import CopyButton from "@/components/ui/CopyButton";

interface SnippetCardProps {
  snippet: Snippet;
  labels: { copy: string; copied: string; lines: string };
}

/** One code snippet as a stacked index card (sage matcha). */
export default function SnippetCard({ snippet, labels }: SnippetCardProps) {
  const [expanded, setExpanded] = useState(false);
  const lineCount = snippet.code.split("\n").length;
  const collapsible = lineCount > 40;
  const showAll = !collapsible || expanded;

  return (
    <article className="break-inside-avoid overflow-hidden rounded-card border border-line bg-card shadow-paper">
      <div className="flex items-center justify-between border-b border-line/60 bg-sage/70 px-4 py-2">
        <div className="flex items-center gap-2">
          {snippet.filename && (
            <span className="rounded-full bg-card px-2.5 py-0.5 font-mono text-xs text-ink">
              {snippet.filename}
            </span>
          )}
          <span className="font-hand text-xs text-ink-muted">
            {snippet.language || "text"}
          </span>
        </div>
        <CopyButton text={snippet.code} label={labels.copy} />
      </div>

      {snippet.section && (
        <div className="border-b border-line/40 bg-peach/40 px-4 py-1.5">
          <p className="font-hand text-xs text-ink-muted">{snippet.section}</p>
        </div>
      )}

      <div className="p-4">
        <pre
          className={`overflow-x-auto font-mono text-[13px] leading-relaxed text-ink ${
            showAll ? "" : "max-h-64 overflow-hidden"
          }`}
        >
          <code>{snippet.code}</code>
        </pre>
        {collapsible && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-2 font-hand text-sm text-terracotta"
          >
            {expanded ? "Collapse" : `Show all (${lineCount} ${labels.lines})`}
          </button>
        )}
      </div>
    </article>
  );
}
