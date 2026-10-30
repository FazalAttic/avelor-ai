import { type InputHTMLAttributes, type ReactNode, useId } from "react";
import { cn } from "@/lib/utils";

export const inputClass = cn(
  "h-10 w-full min-w-0 rounded-xl border border-border bg-background px-3.5 text-[13px] text-foreground shadow-2xs",
  "transition-colors duration-150 ease-expo placeholder:text-muted/60",
  "hover:border-admin-ink/30 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 focus:outline-none disabled:pointer-events-none disabled:opacity-45"
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
        className="px-0.5 text-xs font-semibold text-admin-ink flex items-center gap-1"
      >
        <span>{label}</span>
        {props.required && <span className="text-red-500 font-bold">*</span>}
      </label>
      <input id={inputId} className={cn(inputClass, className)} {...props} />
      {hint ? <p className="px-0.5 text-xs leading-normal text-muted">{hint}</p> : null}
    </div>
  );
}
