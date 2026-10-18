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
};

/** Native select on purpose: keyboard, mobile and screen readers come free. */
export function SelectField({
  label,
  options,
  hideLabel,
  className,
  id,
  ...props
}: SelectFieldProps) {
  const generated = useId();
  const selectId = id ?? generated;
  return (
    <div className={cn("flex shrink-0 items-center gap-2", hideLabel && "gap-0", className)}>
      <label
        htmlFor={selectId}
        className={cn(
          "text-[11px] font-semibold tracking-[0.08em] text-muted uppercase",
          hideLabel && "sr-only"
        )}
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          {...props}
          className={cn(
            "h-9 appearance-none rounded-lg border border-admin-edge bg-admin-card py-0 pr-8 pl-2.5 text-[13px] font-medium text-admin-ink",
            "transition-colors duration-150 ease-expo focus:border-admin-ink/35 focus:outline-none",
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
