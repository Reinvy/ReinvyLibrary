"use client";

import ErrorState from "@/components/ui/ErrorState";
import { getDictionary } from "@/lib/i18n";

/** Error boundary scoped to a locale. */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // error is intentionally referenced to keep the boundary stable
  void error;
  const dict = getDictionary("en");
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-paper px-6 py-24">
      <ErrorState
        title={dict.common.errorTitle}
        message={dict.common.errorMessage}
        retryLabel={dict.common.retry}
        onRetry={() => reset()}
      />
    </div>
  );
}
