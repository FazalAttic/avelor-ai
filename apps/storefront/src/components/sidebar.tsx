"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Edit01Icon, FavouriteIcon, PackageIcon, UserIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { SideNavItem } from "@/components/side-nav-item";
import { cn } from "@/lib/utils";

export type RecentChat = { id: string; title: string };

export type SidebarProps = {
  open: boolean;
  recentChats?: RecentChat[];
};

const NAV_ITEMS = [
  { label: "Favourites", icon: FavouriteIcon, href: "/favourites" },
  { label: "Orders", icon: PackageIcon, href: "/orders" },
  { label: "Account", icon: UserIcon, href: "/account" },
] as const;

const DEFAULT_RECENT_CHATS: RecentChat[] = [
  { id: "r1", title: "Wireless earbuds under $50" },
  { id: "r2", title: "Standing desk recommendations" },
  { id: "r3", title: "Gift ideas for a gamer" },
  { id: "r4", title: "Compare running shoes" },
  { id: "r5", title: "4K monitor deals this week" },
];

export function Sidebar({ open, recentChats = DEFAULT_RECENT_CHATS }: SidebarProps) {
  return (
    <aside
      aria-hidden={!open}
      className={cn(
        "fixed bottom-3 left-3 top-16 z-40 flex w-[280px] max-w-[calc(100dvw-24px)] flex-col p-3",
        "rounded-3xl border border-border bg-surface shadow-pop",
        "transition-all duration-300 ease-expo",
        open ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-3 opacity-0",
      )}
    >
      <button
        type="button"
        title="New chat"
        className={cn(
          "flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-white",
          "bg-[image:var(--gradient-brand)] shadow-[0_4px_16px_rgba(32,56,248,0.35)] transition-opacity duration-150 ease-expo hover:opacity-90",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue",
        )}
      >
        <HugeiconsIcon icon={Edit01Icon} size={18} strokeWidth={2} className="shrink-0" />
        New chat
      </button>

      <nav aria-label="Main" className="mt-3 flex shrink-0 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <SideNavItem key={item.href} {...item} />
        ))}
      </nav>

      {recentChats.length > 0 && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <p className="px-2.5 pb-1 text-xs font-medium text-subtle">Recents</p>
          <div className="flex flex-col gap-0.5 overflow-y-auto">
            {recentChats.map((chat) => (
              <Link
                key={chat.id}
                href="/"
                title={chat.title}
                className="block truncate rounded-lg px-2.5 py-2 text-sm text-muted transition-colors duration-150 ease-expo hover:bg-surface-hover hover:text-foreground"
              >
                {chat.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      <Link
        href="/sign-in"
        title="Sign in"
        className="flex shrink-0 items-center gap-3 rounded-xl p-2 transition-colors duration-150 ease-expo hover:bg-surface-hover"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-brand)] text-xs font-semibold text-white">
          G
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">Sign in</span>
      </Link>
    </aside>
  );
}
