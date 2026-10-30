import { UnfoldMoreIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type SelectHTMLAttributes, useId } from "react";
import { cn } from "@/lib/utils";

export type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  label: string;
  options: readonly { value: string; label: string }[];
  id?: string;
  /** Keep the label for screen readers only — for controls inside a table row. */
  hideLabel?: boolean;
  direction?: "horizontal" | "vertical";
  wrapperClassName?: string;
};

/** Native select on purpose: keyboard, mobile and screen readers come free. */
export function SelectField({
  label,
  options,
  hideLabel,
  direction = "horizontal",
  className,
  wrapperClassName,
  id,
  ...props
}: SelectFieldProps) {
  const generated = useId();
  const selectId = id ?? generated;

  if (direction === "vertical") {
    return (
      <div className={cn("flex min-w-0 flex-col gap-1.5", wrapperClassName, className)}>
        <label
          htmlFor={selectId}
          className={cn(
            "px-0.5 text-xs font-semibold text-admin-ink flex items-center gap-1",
            hideLabel && "sr-only"
          )}
        >
          <span>{label}</span>
          {props.required && <span className="text-red-500 font-bold">*</span>}
        </label>
        <div className="relative w-full">
          <select
            id={selectId}
            {...props}
            className={cn(
              "h-10 w-full appearance-none rounded-xl border border-border bg-background py-0 pr-9 pl-3.5 text-[13px] font-medium text-admin-ink shadow-2xs",
              "transition-colors duration-150 ease-expo hover:border-admin-ink/30 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 focus:outline-none",
              "disabled:pointer-events-none disabled:opacity-45"
            )}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <HugeiconsIcon
            icon={UnfoldMoreIcon}
            size={16}
            strokeWidth={2}
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex shrink-0 items-center gap-2", hideLabel && "gap-0", className)}>
      <label
        htmlFor={selectId}
        className={cn("text-xs font-semibold text-admin-ink", hideLabel && "sr-only")}
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          {...props}
          className={cn(
            "h-9 appearance-none rounded-lg border border-border bg-background py-0 pr-8 pl-2.5 text-[13px] font-medium text-admin-ink shadow-2xs",
            "transition-colors duration-150 ease-expo hover:border-admin-ink/30 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 focus:outline-none",
            "disabled:pointer-events-none disabled:opacity-45"
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <HugeiconsIcon
          icon={UnfoldMoreIcon}
          size={14}
          strokeWidth={2}
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted"
        />
      </div>
    </div>
  );
}
