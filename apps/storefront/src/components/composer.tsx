"use client";

import { Add01Icon, ArrowUp01Icon, Mic01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type Ref, useRef, useState } from "react";
import { IconButton } from "@/components/icon-button";
import { cn } from "@/lib/utils";

export type ComposerProps = {
  placeholder?: string;
  onSubmit?: (text: string) => void;
  disabled?: boolean;
  className?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  inputRef?: Ref<HTMLTextAreaElement>;
};

export function Composer({
  placeholder = "Ask me anything…",
  onSubmit,
  disabled = false,
  className,
  value: controlledValue,
  onValueChange,
  inputRef,
}: ComposerProps) {
  const [innerValue, setInnerValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const value = controlledValue ?? innerValue;
  const canSend = value.trim().length > 0 && !disabled;

  function setValue(next: string) {
    onValueChange?.(next);
    setInnerValue(next);
  }

  const setRefs = (el: HTMLTextAreaElement | null) => {
    textareaRef.current = el;
    if (typeof inputRef === "function") inputRef(el);
    else if (inputRef) inputRef.current = el;
  };

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  function submit() {
    if (!canSend) return;
    onSubmit?.(value.trim());
    setValue("");
    requestAnimationFrame(resize);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className={cn(
        "w-full rounded-[28px] border border-border bg-surface p-2 shadow-card transition-shadow duration-200 ease-expo",
        "focus-within:border-brand-blue/40 focus-within:shadow-pop",
        className
      )}
    >
      <textarea
        ref={setRefs}
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => {
          setValue(event.target.value);
          resize();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        className="max-h-[200px] w-full resize-none bg-transparent px-4 pt-3 pb-1 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-subtle"
      />
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="flex items-center gap-1.5">
          <IconButton label="Attach file">
            <HugeiconsIcon icon={Add01Icon} size={20} strokeWidth={1.8} />
          </IconButton>
        </div>
        <div className="flex items-center gap-1.5">
          <IconButton label="Voice input (coming soon)" disabled>
            <HugeiconsIcon icon={Mic01Icon} size={20} strokeWidth={1.8} />
          </IconButton>
          <button
            type="submit"
            aria-label="Send message"
            disabled={!canSend}
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-full text-white",
              "transition-all duration-200 ease-expo",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue",
              canSend
                ? "bg-[image:var(--gradient-brand)] shadow-[0_4px_16px_rgba(32,56,248,0.35)] hover:opacity-90"
                : "cursor-default bg-border-strong"
            )}
          >
            <HugeiconsIcon icon={ArrowUp01Icon} size={20} strokeWidth={2} />
          </button>
        </div>
      </div>
    </form>
  );
}
