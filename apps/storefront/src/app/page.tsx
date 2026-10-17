"use client";

import { useRef, useState } from "react";
import { ChatShell } from "@/components/chat-shell";
import { Composer } from "@/components/composer";
import { ProductMarquee } from "@/components/product-marquee";

const STARTERS = [
  { emoji: "👟", text: "Running shoes under $100", tilt: "rotate-[1.4deg] translate-y-[2px]" },
  { emoji: "🎮", text: "A gift for a gamer", tilt: "-rotate-[1.8deg] -translate-y-[2.5px]" },
  { emoji: "🧥", text: "Cozy hoodie weather", tilt: "rotate-[1.1deg] translate-y-[1.5px]" },
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  return (
    <ChatShell>
      <ProductMarquee />
      <div className="flex w-full max-w-3xl translate-y-10 flex-col items-center gap-10 md:translate-y-14">
        <h1 className="text-center text-3xl font-medium tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Find your{" "}
          <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent">
            perfect pair
          </span>{" "}
          of shoes
        </h1>
        <div className="w-full rounded-[32px] border border-white/50 bg-white/25 p-3 shadow-card backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
          <Composer
            placeholder="What are you looking for?"
            value={prompt}
            onValueChange={setPrompt}
            inputRef={inputRef}
            onSubmit={() => setPrompt("")}
          />
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-3 pb-1">
            {STARTERS.map((starter) => (
              <button
                key={starter.text}
                type="button"
                onClick={() => {
                  setPrompt(starter.text);
                  inputRef.current?.focus();
                }}
                className={
                  "inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/55 px-3 py-1.5 text-xs font-medium text-foreground shadow-card backdrop-blur-xl " +
                  `${starter.tilt} ` +
                  "transition-all duration-200 ease-expo hover:rotate-0 hover:translate-y-0 hover:scale-105 hover:bg-white/80 hover:shadow-pop active:scale-95 sm:px-3.5 sm:text-[13px] " +
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue " +
                  "dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/20"
                }
              >
                <span className="text-sm leading-none">{starter.emoji}</span>
                <span>{starter.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-3 px-4 text-[11px] font-medium text-muted sm:gap-5 sm:text-xs">
        <span className="whitespace-nowrap">Free 30-day returns</span>
        <span aria-hidden className="size-1 rounded-full bg-border-strong" />
        <span className="hidden whitespace-nowrap min-[420px]:block">Free shipping over $75</span>
        <span
          aria-hidden
          className="hidden size-1 rounded-full bg-border-strong min-[420px]:block"
        />
        <span className="whitespace-nowrap">Secure checkout</span>
      </div>
    </ChatShell>
  );
}
