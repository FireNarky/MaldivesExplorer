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
      className="grid max-w-[65ch] gap-4 rounded-2xl border border-danger/40 bg-danger-surface p-6 shadow-1"
      role="alert"
    >
      <div className="flex items-start gap-2.5 text-danger">
        <CircleX aria-hidden="true" className="mt-1 size-7 shrink-0 text-danger" strokeWidth={1.75} />
        <h2 className="text-danger font-display text-xl">{title}</h2>
      </div>
      <div className="text-base text-ink dark:text-slate-200">{children}</div>
      {action}
    </section>
  );
}
