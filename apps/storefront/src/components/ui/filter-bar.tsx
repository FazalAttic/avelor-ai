import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SearchField({
  value,
  onChange,
  label,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-0 grow sm:max-w-[300px]", className)}>
      <HugeiconsIcon
        icon={Search01Icon}
        size={15}
        strokeWidth={1.9}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-9 w-full rounded-lg border border-admin-edge bg-admin-card pl-8.5 text-[13px] text-admin-ink",
          "transition-colors duration-150 ease-expo placeholder:text-subtle",
          "focus:border-admin-ink/35 focus:outline-none",
          "[&::-webkit-search-cancel-button]:appearance-none"
        )}
      />
    </div>
  );
}

/**
 * One row of controls above every list: search, the filters a route needs, and
 * the primary action pinned to the right edge.
 */
export function FilterBar({
  children,
  actions,
  className,
}: {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {children}
      {actions ? <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
