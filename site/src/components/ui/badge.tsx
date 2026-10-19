import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-sm px-2 py-1 text-sm font-semibold", {
  variants: {
    tone: {
      info: "bg-info-surface text-info",
      success: "bg-success-surface text-success",
      warning: "bg-warning-surface text-warning",
      danger: "bg-danger-surface text-danger",
      neutral: "border border-border bg-sand text-muted",
      quoted: "bg-mist text-lagoon-ink",
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
