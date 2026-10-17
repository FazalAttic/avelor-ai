"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type OtpInputProps = {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  onComplete?: (code: string) => void;
  label?: string;
  className?: string;
};

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled,
  autoFocus,
  onComplete,
  label = "Verification code",
  className,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const register = (index: number, node: HTMLInputElement | null) => {
    refs.current[index] = node;
  };

  const focusBox = (index: number) => {
    refs.current[Math.max(0, Math.min(index, length - 1))]?.focus();
  };

  function commit(next: string, caret: number) {
    const trimmed = next.slice(0, length);
    onChange(trimmed);
    if (trimmed.length === length) onComplete?.(trimmed);
    else focusBox(caret);
  }

  function typeAt(index: number, char: string) {
    if (!char) return;
    const next =
      index < value.length ? value.slice(0, index) + char + value.slice(index + 1) : value + char;
    commit(next, Math.min(next.length, length - 1));
  }

  // Backspace on a filled box clears it; on an empty one it clears and rewinds,
  // so the code never holds a gap.
  function backspaceAt(index: number) {
    const target = value[index] ? index : Math.max(0, index - 1);
    commit(value.slice(0, target) + value.slice(target + 1), target);
  }

  function pasteAt(index: number, text: string) {
    const digits = text.replace(/\D/g, "");
    if (!digits) return;
    commit((value.slice(0, index) + digits).slice(0, length), length - 1);
  }

  return (
    <div className="flex gap-2">
      {Array.from({ length }, (_, index) => {
        const char = value[index] ?? "";
        return (
          <input
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length OTP digit slots
            key={`otp-slot-${index}`}
            ref={(node) => register(index, node)}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            pattern="[0-9]*"
            maxLength={1}
            disabled={disabled}
            aria-label={`${label} digit ${index + 1}`}
            value={char}
            onChange={(event) => typeAt(index, event.target.value.replace(/\D/g, "").slice(-1))}
            onKeyDown={(event) => {
              if (event.key !== "Backspace") return;
              event.preventDefault();
              backspaceAt(index);
            }}
            onPaste={(event) => {
              event.preventDefault();
              pasteAt(index, event.clipboardData.getData("text"));
            }}
            onFocus={(event) => event.target.select()}
            className={cn(
              "h-12 w-full min-w-0 rounded-xl border bg-background text-center text-lg font-semibold text-foreground tabular-nums",
              "transition-colors duration-150 ease-expo focus:border-brand-blue focus:outline-none",
              "disabled:pointer-events-none disabled:opacity-45",
              char ? "border-border-strong" : "border-border",
              className
            )}
          />
        );
      })}
    </div>
  );
}
