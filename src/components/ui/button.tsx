import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group inline-flex min-w-11 items-center justify-center gap-2 rounded-full font-medium tracking-wide whitespace-nowrap transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-sand disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-ocean text-sand shadow-[0_1px_0_rgba(255,255,255,.15)_inset,0_8px_20px_-10px_rgba(10,35,66,.6)] hover:-translate-y-px hover:bg-[#12325c] dark:bg-[#E2B65C] dark:text-[#0a2342] dark:hover:bg-[#ebc576]",
        secondary:
          "border border-ocean/20 bg-transparent text-ocean hover:border-ocean/50 hover:bg-ocean/[0.04] dark:border-white/20 dark:text-white dark:hover:border-white/40 dark:hover:bg-white/[0.06]",
        tertiary:
          "bg-transparent px-2 text-ink underline-offset-4 hover:underline dark:text-white",
        conversion:
          "bg-coral text-[#0a2342] shadow-[0_1px_0_rgba(255,255,255,.35)_inset,0_10px_24px_-12px_rgba(242,105,75,.9)] hover:-translate-y-px hover:bg-coral-hover",
        glass:
          "border border-white/25 bg-white/10 text-white backdrop-blur-md hover:-translate-y-px hover:bg-white/20",
        gold:
          "bg-[#E2B65C] text-[#0a2342] shadow-[0_1px_0_rgba(255,255,255,.4)_inset,0_10px_24px_-12px_rgba(226,182,92,.9)] hover:-translate-y-px hover:bg-[#ebc576]",
        destructive: "bg-danger text-white hover:opacity-90 dark:bg-rose-600",
      },
      size: {
        sm: "min-h-9 px-4 text-sm",
        md: "min-h-11 px-5 text-[0.95rem]",
        lg: "min-h-13 px-7 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
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
  size,
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
      className={cn(buttonVariants({ variant, size }), error && "ring-2 ring-danger", className)}
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
