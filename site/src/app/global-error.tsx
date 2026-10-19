"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { display, sans } from "@/lib/fonts";
import "./globals.css";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <main id="main" className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-8">
          <ErrorState
            title="Something went wrong"
            action={
              <Button type="button" onClick={reset}>
                Try again
              </Button>
            }
          >
            The application could not be displayed.
          </ErrorState>
        </main>
      </body>
    </html>
  );
}
