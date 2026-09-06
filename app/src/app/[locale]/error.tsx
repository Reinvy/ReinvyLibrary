"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ErrorState from "@/components/ui/ErrorState";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

/** Error boundary scoped to a locale. */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const locale: Locale = params?.locale === "id" ? "id" : "en";
  const dict = getDictionary(locale);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    console.error("[locale-error]", {
      digest: error.digest,
      message: error.message,
      stack: error.stack,
    });
    // Telemetry hook: reportError(error) — wire Sentry/OTel here when DSN exists.
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-paper px-6 py-24">
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
      {error.digest && (
        <p className="mt-4 font-mono text-xs text-ink-muted">ID: {error.digest}</p>
      )}
    </div>
  );
}
