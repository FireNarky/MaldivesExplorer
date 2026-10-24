import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function Input({ className, invalid = false, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        "min-h-11 w-full rounded-sm border border-border bg-white px-4 text-base text-ink placeholder:text-muted focus-visible:border-focus disabled:cursor-not-allowed disabled:bg-sand disabled:text-muted dark:bg-[#0c1c24] dark:border-[#223d4d] dark:text-white dark:placeholder:text-[#6a828e] dark:focus-visible:border-cyan-400",
        invalid && "border-danger dark:border-rose-500",
        className,
      )}
      {...props}
    />
  );
}
