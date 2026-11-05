"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <ErrorState onRetry={reset} />
    </main>
  );
}
