import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "ink";
export type ButtonSize = "sm" | "md" | "lg";

const BASE = cn(
  "inline-flex shrink-0 items-center justify-center font-semibold select-none",
  "transition-colors duration-150 ease-expo",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue",
  "disabled:pointer-events-none disabled:opacity-45"
);

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-foreground text-background hover:bg-foreground/85",
  secondary:
    "border border-border bg-surface text-foreground hover:border-border-strong hover:bg-surface-hover",
  ghost: "text-muted hover:bg-surface-hover hover:text-foreground",
  danger:
    "border border-red-500/25 text-red-600 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-400/10",
  ink: "bg-admin-ink text-admin-ink-contrast hover:bg-admin-ink/88",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-2.5 text-[12px]",
  md: "h-9 gap-2 rounded-full px-3.5 text-[13px]",
  lg: "h-11 gap-2 rounded-xl px-4 text-sm",
};

export function buttonClass(
  options: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; className?: string } = {}
) {
  const { variant = "secondary", size = "md", block, className } = options;
  return cn(BASE, VARIANTS[variant], SIZES[size], block && "w-full", className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  children: ReactNode;
};

export function Button({
  variant,
  size,
  block,
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClass({ variant, size, block, className })} {...props}>
      {children}
    </button>
  );
}
