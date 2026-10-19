"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

export type SlideOverProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  width?: "lg" | "xl" | "2xl" | "3xl" | "4xl";
};

const WIDTH_MAP: Record<NonNullable<SlideOverProps["width"]>, string> = {
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
};

/**
 * Console slide-over: an expansive side panel anchored to the right viewport edge.
 * Replaces narrow center modals for information-dense forms (products, columns, variants).
 */
export function SlideOver({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  width = "3xl",
}: SlideOverProps) {
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

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="admin-fade fixed inset-0 z-50 flex justify-end overflow-hidden">
      <button
        type="button"
        aria-label="Close panel"
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
          "admin-slide-left relative z-10 flex h-full w-full flex-col overflow-hidden",
          "border-l border-admin-edge bg-admin-card shadow-2xl outline-none",
          WIDTH_MAP[width],
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-admin-edge px-6 py-4 sm:px-7">
          <div className="min-w-0">
            <h2 id={headingId} className="text-base font-semibold tracking-tight text-admin-ink">
              {title}
            </h2>
            {description ? (
              <p className="pt-0.5 text-xs leading-relaxed text-muted">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn(
              "-mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted",
              "transition-colors duration-150 ease-expo hover:bg-admin-line/60 hover:text-admin-ink",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
            )}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-7">{children}</div>

        {footer ? (
          <div className="flex items-center justify-end gap-2.5 border-t border-admin-edge bg-admin-line/40 px-6 py-3.5 sm:px-7">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
