"use client";

import ErrorState from "@/components/ui/ErrorState";
import { getDictionary } from "@/lib/i18n";

/** Root-level error boundary. */
export default function RootError({ reset }: { reset: () => void }) {
  const dict = getDictionary("en");
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-8">
      <ErrorState
        title={dict.common.errorTitle}
        message={dict.common.errorMessage}
        retryLabel={dict.common.retry}
        onRetry={() => reset()}
      />
    </div>
  );
}
