"use client";

import { useState } from "react";

interface CopyButtonProps {
  text: string;
  label?: string;
}

/** Copies text to clipboard and shows a transient "Copied! ✨" state. */
export default function CopyButton({ text, label = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback for older browsers / non-secure contexts
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label}
      className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 font-hand text-sm text-ink shadow-paper transition hover:bg-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
    >
      {copied ? (
        <>
          <svg aria-hidden className="h-3.5 w-3.5 text-eucalyptus" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span className="text-eucalyptus">Copied! ✨</span>
        </>
      ) : (
        <>
          <svg aria-hidden className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect width="14" height="14" x="8" y="8" rx="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
