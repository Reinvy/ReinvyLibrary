"use client";

import { useEffect, useRef, useState } from "react";

interface CopyButtonProps {
  text: string;
  label?: string;
}

/** Copies text to clipboard with pending guard, timer cleanup, and real failure state. */
export default function CopyButton({ text, label = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const flash = (ok: boolean) => {
    setCopied(ok);
    setFailed(!ok);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCopied(false);
      setFailed(false);
    }, 2000);
  };

  const onCopy = async () => {
    if (isCopying) return;
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(text);
      flash(true);
    } catch {
      try {
        // fallback for older browsers / non-secure contexts
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        flash(ok);
      } catch {
        flash(false);
      }
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      disabled={isCopying}
      aria-label={label}
      aria-live="polite"
      className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 font-hand text-sm text-ink shadow-paper transition hover:bg-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60 disabled:cursor-wait disabled:opacity-70"
    >
      {copied ? (
        <>
          <svg aria-hidden className="h-3.5 w-3.5 text-eucalyptus" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span className="text-eucalyptus">Copied! ✨</span>
        </>
      ) : failed ? (
        <span className="text-terracotta">Copy failed</span>
      ) : (
        <>
          <svg aria-hidden className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect width="14" height="14" x="8" y="8" rx="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
          <span>{isCopying ? "…" : label}</span>
        </>
      )}
    </button>
  );
}
