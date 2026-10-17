import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2 text-center", className)}>
      {icon ? (
        <span className="mb-1 flex size-10 items-center justify-center rounded-xl bg-admin-rail text-muted">
          {icon}
        </span>
      ) : null}
      <p className="text-[13px] font-semibold text-admin-ink">{title}</p>
      {description ? <p className="max-w-[34ch] text-xs text-muted">{description}</p> : null}
      {action ? <span className="pt-1.5">{action}</span> : null}
    </div>
  );
}
