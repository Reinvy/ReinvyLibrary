"use client";

interface ErrorStateProps {
  title: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

/** Scrapbook-themed error state for error boundaries. */
export default function ErrorState({ title, message, retryLabel = "Try again", onRetry }: ErrorStateProps) {
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
        <path d="M18 40 32 18l14 22z" />
        <path d="M32 28v8" />
        <circle cx="32" cy="42" r="1.5" fill="currentColor" />
        <path d="M14 50c6 4 14 4 20 0s14-4 20 0" />
      </svg>
      <h2 className="font-hand text-2xl text-ink">{title}</h2>
      <p className="mt-2 max-w-sm text-ink-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-full bg-terracotta px-5 py-2.5 font-hand text-sm text-card shadow-paper transition hover:-rotate-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
