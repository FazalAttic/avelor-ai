"use client";

import { Add01Icon, ArrowUp01Icon, Mic01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "framer-motion";
import { type Ref, useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/icon-button";
import { cn } from "@/lib/utils";

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    [index: number]: {
      readonly isFinal: boolean;
      readonly length: number;
      [index: number]: { readonly transcript: string; readonly confidence: number };
    };
  };
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

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
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const value = controlledValue ?? innerValue;
  const canSend = value.trim().length > 0 && !disabled;

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  function toggleListening() {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRec = getSpeechRecognition();
    if (!SpeechRec) {
      alert("Voice input is not supported in this browser. Please use Google Chrome.");
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang =
        typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";

      const baseText = value.trim() ? `${value.trim()} ` : "";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i]?.[0];
          if (item?.transcript) {
            transcript += item.transcript;
          }
        }
        if (transcript) {
          setValue(`${baseText}${transcript}`);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        textareaRef.current?.focus();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  }

  function setValue(next: string) {
    onValueChange?.(next);
    setInnerValue(next);
  }

  const setRefs = (el: HTMLTextAreaElement | null) => {
    textareaRef.current = el;
    if (typeof inputRef === "function") inputRef(el);
    else if (inputRef) inputRef.current = el;
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: value change triggers height measurement
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const current = el.style.height;
    el.style.height = "auto";
    const nextHeight = Math.min(Math.max(el.scrollHeight, 44), 200);
    el.style.height = current;
    setHeight(nextHeight);
  }, [value]);

  function submit() {
    if (!canSend) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    onSubmit?.(value.trim());
    setValue("");
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
      <motion.textarea
        ref={setRefs}
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        animate={height !== undefined ? { height } : undefined}
        transition={{
          type: "spring",
          stiffness: 420,
          damping: 32,
          mass: 0.7,
        }}
        onChange={(event) => {
          setValue(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        className={cn(
          "max-h-[200px] w-full resize-none bg-transparent px-4 pt-3 pb-1 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-subtle",
          height && height >= 200 ? "overflow-y-auto" : "overflow-hidden"
        )}
      />
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="flex items-center gap-1.5">
          <IconButton label="Attach file">
            <HugeiconsIcon icon={Add01Icon} size={20} strokeWidth={1.8} />
          </IconButton>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleListening}
            disabled={disabled}
            aria-label={isListening ? "Stop listening" : "Voice input"}
            title={isListening ? "Listening… (click to stop)" : "Voice input"}
            className={cn(
              "relative inline-flex size-9 items-center justify-center rounded-full transition-all duration-200 ease-expo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue",
              isListening
                ? "bg-red-500/15 text-red-600 shadow-sm ring-2 ring-red-500/40 dark:bg-red-500/20 dark:text-red-400"
                : "text-muted hover:bg-surface-hover hover:text-foreground active:scale-95"
            )}
          >
            {isListening ? (
              <>
                <span className="absolute inset-0 animate-ping rounded-full bg-red-400/20" />
                <HugeiconsIcon icon={Mic01Icon} size={20} strokeWidth={2} />
              </>
            ) : (
              <HugeiconsIcon icon={Mic01Icon} size={20} strokeWidth={1.8} />
            )}
          </button>
          <motion.button
            type="submit"
            aria-label="Send message"
            disabled={!canSend}
            whileHover={canSend ? { scale: 1.05 } : undefined}
            whileTap={canSend ? { scale: 0.9 } : undefined}
            transition={{ type: "spring", stiffness: 450, damping: 20 }}
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-full",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue",
              canSend ? "btn-brand cursor-pointer" : "cursor-default bg-border-strong text-white/50"
            )}
          >
            <HugeiconsIcon icon={ArrowUp01Icon} size={20} strokeWidth={2} />
          </motion.button>
        </div>
      </div>
    </form>
  );
}
