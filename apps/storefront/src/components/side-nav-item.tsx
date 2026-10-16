import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type SideNavItemProps = {
  href: string;
  label: string;
  icon: IconSvgElement;
  active?: boolean;
};

export function SideNavItem({ href, label, icon, active = false }: SideNavItemProps) {
  return (
    <Link
      href={href}
      title={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 shrink-0 items-center gap-3 rounded-xl px-2.5 text-sm font-medium transition-colors duration-150 ease-expo",
        active
          ? "bg-brand-wash text-brand-blue"
          : "text-muted hover:bg-surface-hover hover:text-foreground",
      )}
    >
      <HugeiconsIcon icon={icon} size={20} strokeWidth={1.8} className="shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
