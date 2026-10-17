import { cn } from "@/lib/utils";

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <fieldset
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full min-w-0 shrink-0 items-center gap-0.5 overflow-x-auto rounded-full",
        "border border-admin-line bg-admin-rail p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      <legend className="sr-only">{ariaLabel}</legend>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-7 rounded-full px-2.5 text-[12px] font-semibold whitespace-nowrap",
              "transition-colors duration-150 ease-expo",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue",
              active
                ? "bg-admin-card text-admin-ink shadow-card"
                : "text-muted hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </fieldset>
  );
}
