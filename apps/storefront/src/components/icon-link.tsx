import type { AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type IconLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  label: string;
  href: string;
};

export function IconLink({ label, className, children, ...props }: IconLinkProps) {
  return (
    <Link
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-full text-muted",
        "transition-colors duration-150 ease-expo hover:bg-surface-hover hover:text-foreground",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
