import { CircleX } from "lucide-react";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type FieldErrorProps = HTMLAttributes<HTMLParagraphElement> & {
  children: string;
};

export function FieldError({ className, children, ...props }: FieldErrorProps) {
  return (
    <p
      className={cn("flex items-start gap-2 text-base text-danger", className)}
      role="alert"
      {...props}
    >
      <CircleX aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
      <span>{children}</span>
    </p>
  );
}
