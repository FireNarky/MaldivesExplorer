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
          "bg-lagoon-ink text-white hover:bg-lagoon-ink-hover active:bg-lagoon-ink-hover disabled:hover:bg-mist dark:bg-lagoon-ink dark:text-white dark:hover:bg-lagoon-ink-hover",
        secondary:
          "border border-border bg-white text-ink hover:bg-sand active:bg-sand disabled:hover:bg-mist dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 dark:active:bg-white/15",
        tertiary:
          "bg-transparent text-ink underline-offset-4 hover:underline active:underline dark:text-white dark:hover:text-cyan-300",
        conversion:
          "bg-coral text-[#111827] hover:bg-coral-hover active:bg-coral-hover disabled:hover:bg-mist font-semibold shadow-sm",
        destructive:
          "bg-danger text-white active:bg-danger disabled:bg-danger-surface disabled:hover:bg-danger-surface dark:bg-rose-600 dark:text-white",
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
