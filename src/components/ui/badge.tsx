import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-sm px-2 py-1 text-sm font-semibold", {
  variants: {
    tone: {
      info: "bg-info-surface text-info border border-info/20",
      success: "bg-success-surface text-success border border-success/20",
      warning: "bg-warning-surface text-warning border border-warning/20",
      danger: "bg-danger-surface text-danger border border-danger/20",
      neutral: "border border-border bg-sand text-muted dark:bg-white/5 dark:border-white/15 dark:text-slate-200",
      quoted: "bg-mist text-lagoon-ink dark:bg-[#7ccdc6]/60 dark:text-[#9adbd5] dark:border dark:border-[#7ccdc6]/40",
    },
  },
  defaultVariants: {
    tone: "info",
  },
});

type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
