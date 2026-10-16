"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { FavouriteIcon, PackageIcon, SidebarLeftIcon } from "@hugeicons/core-free-icons";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { IconButton } from "@/components/icon-button";
import { IconLink } from "@/components/icon-link";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

export function ChatShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="relative flex min-h-dvh flex-col">
      {sidebarOpen && (
        <div aria-hidden className="fixed inset-0 z-30" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar open={sidebarOpen} />

      <div className="fixed left-3 top-3 z-40 flex items-center gap-2">
        <Link
          href="/"
          title="Avelor"
          className="flex h-10 items-center gap-2 rounded-full border border-white/50 bg-white/40 px-3.5 shadow-card backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
        >
          <Image src="/avelor-logo.png" alt="" width={24} height={24} priority />
          <span className="text-sm font-semibold tracking-tight text-foreground">Avelor</span>
        </Link>
        <IconButton
          label="Open sidebar"
          onClick={() => setSidebarOpen(true)}
          className="size-10 border border-white/50 bg-white/40 shadow-card backdrop-blur-xl hover:bg-white/60 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
        >
          <HugeiconsIcon icon={SidebarLeftIcon} size={20} strokeWidth={1.8} />
        </IconButton>
        <ThemeToggle />
      </div>

      <div className="fixed right-3 top-3 z-40">
        <div className="flex h-10 items-center gap-0.5 rounded-full border border-white/50 bg-white/40 p-1 shadow-card backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
          <IconLink label="Orders" href="/orders" className="size-8">
            <HugeiconsIcon icon={PackageIcon} size={20} strokeWidth={1.8} />
          </IconLink>
          <IconLink label="Favourites" href="/favourites" className="size-8">
            <HugeiconsIcon icon={FavouriteIcon} size={20} strokeWidth={1.8} />
          </IconLink>
          <IconLink label="Sign in" href="/sign-in" className="ml-0.5 size-8">
            <span className="flex size-full items-center justify-center rounded-full bg-[image:var(--gradient-brand)] text-xs font-semibold text-white">
              G
            </span>
          </IconLink>
        </div>
      </div>

      <main className="app-stage relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4">
        <div
          aria-hidden
          className="sky pointer-events-none absolute inset-x-0 top-0 z-0 h-[46vh] max-h-[520px]"
        >
          <div className="sky-layer sky-day" />
          <div className="sky-layer sky-night" />
          <div className="sky-layer sky-echo sky-day-echo" />
          <div className="sky-layer sky-echo sky-night-echo" />
        </div>
        {children}
      </main>
    </div>
  );
}
