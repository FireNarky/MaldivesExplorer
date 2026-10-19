"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <ErrorState
      title="Something went wrong"
      action={
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      }
    >
      The page could not be displayed.
    </ErrorState>
  );
}
