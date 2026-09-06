"use client";

import { useEffect, useState } from "react";
import ErrorState from "@/components/ui/ErrorState";
import { getDictionary } from "@/lib/i18n";

/** Root-level error boundary. */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dict = getDictionary("en");
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    console.error("[root-error]", {
      digest: error?.digest,
      message: error?.message,
      stack: error?.stack,
    });
    // Telemetry hook: reportError(error) — wire Sentry/OTel here when DSN exists.
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper p-8">
      <ErrorState
        title={dict.common.errorTitle}
        message={dict.common.errorMessage}
        retryLabel={retrying ? `${dict.common.retry}…` : dict.common.retry}
        pending={retrying}
        onRetry={() => {
          if (retrying) return;
          setRetrying(true);
          reset();
        }}
      />
      {error?.digest && (
        <p className="mt-4 font-mono text-xs text-ink-muted">ID: {error.digest}</p>
      )}
    </div>
  );
}
