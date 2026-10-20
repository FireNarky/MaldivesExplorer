import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  children: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title, children, action }: EmptyStateProps) {
  return (
    <section className="grid max-w-[65ch] gap-4 rounded-2xl border border-border-subtle bg-white dark:bg-[#0d1e27] dark:border-[#1a3442] p-6 shadow-1">
      <h2 className="text-ocean dark:text-cyan-400">{title}</h2>
      <div className="text-base text-ink dark:text-sand/90">{children}</div>
      {action}
    </section>
  );
}
