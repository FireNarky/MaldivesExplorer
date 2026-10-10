import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-4 py-3 text-base font-semibold transition-colors duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] disabled:cursor-not-allowed disabled:bg-mist disabled:text-muted",
  {
    variants: {
      variant: {
        primary:
          "bg-lagoon-ink text-white hover:bg-lagoon-ink-hover active:bg-lagoon-ink-hover disabled:hover:bg-mist",
        secondary:
          "border border-border bg-white text-ink hover:bg-sand active:bg-sand disabled:hover:bg-mist",
        tertiary: "bg-transparent text-ink underline-offset-4 hover:underline active:underline",
        conversion:
          "bg-coral text-ink hover:bg-coral-hover active:bg-coral-hover disabled:hover:bg-mist",
        destructive:
          "bg-danger text-white active:bg-danger disabled:bg-danger-surface disabled:hover:bg-danger-surface",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
    error?: boolean;
  };

export function Button({
  className,
  variant,
  asChild = false,
  loading = false,
  error = false,
  disabled,
  children,
  "aria-label": ariaLabel,
  ...props
}: ButtonProps) {
  const Comp = asChild && !loading ? Slot : "button";
  const isDisabled = Boolean(disabled || loading);
  const accessibleName = loading && ariaLabel ? `Loading, ${ariaLabel}` : ariaLabel;

  return (
    <Comp
      className={cn(buttonVariants({ variant }), error && "ring-2 ring-danger", className)}
      aria-busy={loading || undefined}
      aria-invalid={error || undefined}
      aria-label={accessibleName}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <>
          <span className="spinner" aria-hidden="true" />
          <span className="sr-only">Loading</span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
}
