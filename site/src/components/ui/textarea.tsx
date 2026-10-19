import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export function Textarea({ className, invalid = false, ...props }: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(
        "min-h-24 w-full rounded-sm border border-border bg-white px-4 py-3 text-base text-ink placeholder:text-muted focus-visible:border-focus disabled:cursor-not-allowed disabled:bg-sand disabled:text-muted",
        invalid && "border-danger",
        className,
      )}
      {...props}
    />
  );
}
