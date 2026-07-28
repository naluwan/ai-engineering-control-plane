"use client";

import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16 sm:py-24">
      <PageHeader
        eyebrow="Error"
        title="Something went wrong"
        description="The page failed to render. No internal detail is shown here on purpose; the underlying error is reported to the server logs."
      />

      {error.digest ? (
        <p className="font-mono text-xs text-foreground/50">
          Reference: {error.digest}
        </p>
      ) : null}

      <Button className="self-start" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
