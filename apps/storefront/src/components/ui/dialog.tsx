"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * Console dialog: opaque card, hard edge, no blur. It sheets up from the bottom
 * on phones and centres as a card everywhere else.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  const headingId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    panel.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="admin-fade fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-admin-ink/40"
      />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className={cn(
          "admin-sheet relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl",
          "border border-admin-line bg-admin-card shadow-pop outline-none",
          "sm:max-h-[86dvh] sm:max-w-[560px] sm:rounded-2xl",
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-admin-line px-4 py-3.5">
          <div className="min-w-0">
            <h2 id={headingId} className="text-[15px] font-semibold tracking-tight text-admin-ink">
              {title}
            </h2>
            {description ? <p className="pt-0.5 text-xs text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn(
              "-mr-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted",
              "transition-colors duration-150 ease-expo hover:bg-admin-rail hover:text-admin-ink",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
            )}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-admin-line bg-admin-rail/60 px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
