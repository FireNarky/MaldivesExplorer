"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  invalid?: boolean;
  /** When true, shows a leading lock icon and matching left padding. */
  withIcon?: boolean;
};

/**
 * Password input with a keyboard-operable show/hide control. Shared by login and register so
 * both surfaces behave the same way.
 */
export function PasswordField({
  className,
  withIcon = false,
  id,
  invalid,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      {withIcon ? (
        <Lock
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
      ) : null}
      <Input
        id={id}
        type={visible ? "text" : "password"}
        invalid={invalid}
        className={cn(withIcon && "pl-10 pr-11", !withIcon && "pr-11", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="absolute right-1.5 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-ink transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
      </button>
    </div>
  );
}
