import { type InputHTMLAttributes, type ReactNode, useId } from "react";
import { cn } from "@/lib/utils";

export const inputClass = cn(
  "h-10 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-[13px] text-foreground",
  "transition-colors duration-150 ease-expo placeholder:text-subtle",
  "focus:border-brand-blue focus:outline-none disabled:pointer-events-none disabled:opacity-45"
);

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: ReactNode;
  hint?: ReactNode;
  id?: string;
  wrapperClassName?: string;
};

export function TextField({
  label,
  hint,
  id,
  className,
  wrapperClassName,
  ...props
}: TextFieldProps) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", wrapperClassName)}>
      <label
        htmlFor={inputId}
        className="px-1 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase"
      >
        {label}
      </label>
      <input id={inputId} className={cn(inputClass, className)} {...props} />
      {hint ? <p className="px-1 text-xs leading-snug text-subtle">{hint}</p> : null}
    </div>
  );
}
