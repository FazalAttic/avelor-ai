"use client";

import {
  AccountSettingIcon,
  FavouriteIcon,
  Logout03Icon,
  PackageIcon,
  SidebarLeftIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { AuthModal } from "@/components/auth-modal";
import { IconButton } from "@/components/icon-button";
import { IconLink } from "@/components/icon-link";
import { SettingsModal } from "@/components/settings-modal";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { authClient, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function ChatShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session, isPending } = useSession();
  const user = session?.user ?? null;

  useEffect(() => {
    if (!sidebarOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  async function signOut() {
    setMenuOpen(false);
    await authClient.signOut();
  }

  return (
    <div className="relative flex h-dvh max-h-dvh flex-col overflow-hidden">
      {sidebarOpen && (
        <div aria-hidden className="fixed inset-0 z-30" onClick={() => setSidebarOpen(false)} />
      )}
      {menuOpen && (
        <div aria-hidden className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
      )}
      <Sidebar
        open={sidebarOpen}
        onSignIn={() => setAuthOpen(true)}
        onSettings={() => setSettingsOpen(true)}
      />

      <div className="fixed left-6 top-5 z-40 flex items-center gap-2 sm:left-8 sm:top-6">
        <Link
          href="/"
          title="Avelor"
          className="flex h-10 items-center gap-2 rounded-full border border-white/50 bg-white/40 px-3 shadow-card backdrop-blur-xl sm:px-3.5 dark:border-white/10 dark:bg-white/10"
        >
          <Image
            src="/avelor-logo.png"
            alt=""
            width={24}
            height={24}
            priority
            style={{ width: "auto", height: "auto" }}
          />
          <span className="hidden text-sm font-semibold tracking-tight text-foreground min-[420px]:inline">
            Avelor
          </span>
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

      <div className="fixed right-6 top-5 z-40 sm:right-8 sm:top-6">
        <div className="flex h-10 items-center gap-0.5 rounded-full border border-white/50 bg-white/40 p-1 shadow-card backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
          <IconLink label="Orders" href="/orders" className="size-8">
            <HugeiconsIcon icon={PackageIcon} size={20} strokeWidth={1.8} />
          </IconLink>
          <IconLink label="Favourites" href="/favourites" className="size-8">
            <HugeiconsIcon icon={FavouriteIcon} size={20} strokeWidth={1.8} />
          </IconLink>

          {isPending ? (
            <div aria-hidden className="ml-0.5 size-8 rounded-full bg-foreground/10" />
          ) : user ? (
            <button
              type="button"
              title={user.name}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
              className="ml-0.5 flex size-8 items-center justify-center rounded-full transition-transform duration-150 ease-expo hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
            >
              <UserAvatar name={user.name} image={user.image} size="sm" />
            </button>
          ) : (
            <button
              type="button"
              title="Sign in"
              onClick={() => setAuthOpen(true)}
              className="ml-0.5 flex size-8 items-center justify-center rounded-full transition-transform duration-150 ease-expo hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
            >
              <span className="flex size-full items-center justify-center rounded-full bg-foreground text-background">
                <HugeiconsIcon icon={UserIcon} size={14} strokeWidth={2.2} />
              </span>
            </button>
          )}
        </div>

        {menuOpen && user && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] w-56 rounded-3xl border border-white/50 bg-white/50 p-2 shadow-pop backdrop-blur-2xl dark:border-white/10 dark:bg-[#15182b]/80"
          >
            <div className="flex items-center gap-2.5 px-2 py-2">
              <UserAvatar name={user.name} image={user.image} size="md" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {user.name}
                </span>
                <span className="block truncate text-xs text-muted">{user.email}</span>
              </span>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setSettingsOpen(true);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-foreground",
                "transition-colors duration-150 ease-expo hover:bg-white/70 dark:hover:bg-white/10"
              )}
            >
              <HugeiconsIcon icon={AccountSettingIcon} size={18} strokeWidth={1.8} />
              Account settings
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-foreground",
                "transition-colors duration-150 ease-expo hover:bg-white/70 dark:hover:bg-white/10"
              )}
            >
              <HugeiconsIcon icon={Logout03Icon} size={18} strokeWidth={1.8} />
              Sign out
            </button>
          </motion.div>
        )}
      </div>

      <main className="app-stage relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <div
          aria-hidden
          className="sky pointer-events-none fixed inset-x-0 top-0 z-0 h-[46vh] max-h-[520px]"
        >
          <div className="sky-layer sky-day" />
          <div className="sky-layer sky-night" />
          <div className="sky-layer sky-echo sky-day-echo" />
          <div className="sky-layer sky-echo sky-night-echo" />
        </div>
        {children}
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSignIn={() => {
          setSettingsOpen(false);
          setAuthOpen(true);
        }}
      />
    </div>
  );
}
