import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  children: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title, children, action }: EmptyStateProps) {
  return (
    <section className="grid max-w-[65ch] gap-4 rounded-lg border border-border-subtle bg-white p-6 shadow-1">
      <h2>{title}</h2>
      <div className="text-base text-ink">{children}</div>
      {action}
    </section>
  );
}
