"use client";

import { useEffect, useState } from "react";

/**
 * Root layout failure fallback. Must render its own <html><body>.
 * Catches errors in src/app/layout.tsx (fonts, env) that error.tsx cannot.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    console.error("[global-error]", {
      digest: error?.digest,
      message: error?.message,
      stack: error?.stack,
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAF7",
          color: "#2D3142",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: 32, maxWidth: 480 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Oh no — the shelf fell over!</h1>
          <p style={{ opacity: 0.7, marginBottom: 24 }}>
            Something went wrong while loading the library. Try again in a moment.
          </p>
          <button
            type="button"
            disabled={retrying}
            onClick={() => {
              if (retrying) return;
              setRetrying(true);
              reset();
            }}
            style={{
              borderRadius: 9999,
              border: "none",
              padding: "10px 20px",
              background: "#E07A5F",
              color: "#fff",
              cursor: retrying ? "wait" : "pointer",
            }}
          >
            {retrying ? "Retrying…" : "Try again"}
          </button>
          {error?.digest && (
            <p style={{ marginTop: 16, fontSize: 12, opacity: 0.6, fontFamily: "monospace" }}>
              ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
