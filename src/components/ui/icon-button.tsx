import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button } from "@/components/ui/button";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children"> & {
  "aria-label": string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "tertiary" | "conversion" | "destructive";
  loading?: boolean;
  error?: boolean;
};

export function IconButton({ className, children, ...props }: IconButtonProps) {
  return (
    <Button className={`size-11 px-0 ${className ?? ""}`} {...props}>
      <span aria-hidden="true">{children}</span>
    </Button>
  );
}
