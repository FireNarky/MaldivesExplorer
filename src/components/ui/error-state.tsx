import { CircleX } from "lucide-react";
import type { ReactNode } from "react";

type ErrorStateProps = {
  title: string;
  children: ReactNode;
  action?: ReactNode;
};

export function ErrorState({ title, children, action }: ErrorStateProps) {
  return (
    <section
      className="grid max-w-[65ch] gap-4 rounded-lg border border-danger bg-danger-surface p-6"
      role="alert"
    >
      <div className="flex items-start gap-2 text-danger">
        <CircleX aria-hidden="true" className="mt-1 size-8 shrink-0" strokeWidth={1.75} />
        <h2 className="text-danger">{title}</h2>
      </div>
      <div className="text-base text-ink">{children}</div>
      {action}
    </section>
  );
}
