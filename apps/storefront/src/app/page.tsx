"use client";

import { useRef, useState } from "react";
import { ChatShell } from "@/components/chat-shell";
import { Composer } from "@/components/composer";
import { ProductMarquee } from "@/components/product-marquee";

const STARTERS = ["Running shoes under $100", "A gift for a gamer", "Cozy hoodie weather"];

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
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2.5">
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => {
                  setPrompt(starter);
                  inputRef.current?.focus();
                }}
                className={
                  "rounded-full border border-white/60 bg-white/55 px-3 py-1.5 text-xs font-medium text-foreground shadow-card backdrop-blur-xl " +
                  "transition-colors duration-150 ease-expo hover:bg-white/75 sm:px-3.5 sm:text-[13px] " +
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue " +
                  "dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                }
              >
                {starter}
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
