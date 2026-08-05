import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  message: string;
  action?: ReactNode;
}

/** Cheerful scrapbook empty state with a hand-drawn doodle. */
export default function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="my-12 flex flex-col items-center rounded-2xl border border-line bg-card p-10 text-center shadow-paper">
      <svg
        aria-hidden
        className="mb-4 h-16 w-16 text-terracotta"
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20h24v28H12z" />
        <path d="M36 28h16v20H36z" />
        <path d="M12 14h10" />
        <circle cx="51" cy="16" r="3" />
        <path d="M48 22l6-8" />
      </svg>
      <h2 className="font-hand text-2xl text-ink">{title}</h2>
      <p className="mt-2 max-w-sm text-ink-muted">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
