import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SideNavItemProps = {
  label: string;
  icon: IconSvgElement;
  active?: boolean;
  badge?: ReactNode;
} & ({ href: string } | { onSelect: () => void });

export function SideNavItem({ label, icon, active = false, badge, ...target }: SideNavItemProps) {
  const className = cn(
    "flex h-10 shrink-0 items-center gap-3 rounded-xl px-2.5 text-sm font-medium transition-colors duration-150 ease-expo",
    active
      ? "bg-brand-wash text-brand-blue"
      : "text-muted hover:bg-surface-hover hover:text-foreground"
  );
  const content = (
    <>
      <HugeiconsIcon icon={icon} size={20} strokeWidth={1.8} className="shrink-0" />
      <span className="truncate">{label}</span>
      {badge !== undefined && badge !== null ? (
        <span className="ml-auto inline-flex items-center rounded-full bg-brand-blue/15 px-2 py-0.5 text-xs font-semibold text-brand-blue">
          {badge}
        </span>
      ) : null}
    </>
  );

  if ("onSelect" in target) {
    return (
      <button type="button" title={label} onClick={target.onSelect} className={className}>
        {content}
      </button>
    );
  }

  return (
    <Link
      href={target.href}
      title={label}
      aria-current={active ? "page" : undefined}
      className={className}
    >
      {content}
    </Link>
  );
}
