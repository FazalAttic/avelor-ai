"use client";

import {
  Delete02Icon,
  Edit01Icon,
  FavouriteIcon,
  PackageIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ScrollArea } from "@/components/scroll-area";
import { SideNavItem } from "@/components/side-nav-item";
import { UserAvatar } from "@/components/user-avatar";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export type RecentChat = { id: string; title: string };

export type SidebarProps = {
  open: boolean;
  recentChats?: RecentChat[];
  activeChatId?: string | null;
  onSelectChat?: (id: string) => void;
  onNewChat?: () => void;
  onDeleteChat?: (id: string) => void;
  onSignIn: () => void;
  onSettings: () => void;
};

const NAV_LINKS = [
  { label: "Favourites", icon: FavouriteIcon, href: "/favourites" },
  { label: "Orders", icon: PackageIcon, href: "/orders" },
] as const;

export function Sidebar({
  open,
  recentChats = [],
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onSignIn,
  onSettings,
}: SidebarProps) {
  const { data: session } = useSession();
  const user = session?.user ?? null;

  return (
    <aside
      aria-hidden={!open}
      className={cn(
        "fixed bottom-5 left-6 top-20 z-40 flex w-[280px] max-w-[calc(100dvw-48px)] flex-col p-3 sm:bottom-6 sm:left-8 sm:max-w-[calc(100dvw-64px)]",
        "rounded-3xl border border-border bg-surface shadow-pop",
        "transition-all duration-300 ease-expo",
        open ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-3 opacity-0"
      )}
    >
      <button
        type="button"
        title="New chat"
        onClick={onNewChat}
        className={cn(
          "flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-white",
          "bg-[image:var(--gradient-brand)] shadow-[0_4px_16px_rgba(32,56,248,0.35)] transition-opacity duration-150 ease-expo hover:opacity-90 active:scale-[0.98]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        )}
      >
        <HugeiconsIcon icon={Edit01Icon} size={18} strokeWidth={2} className="shrink-0" />
        New chat
      </button>

      <nav aria-label="Main" className="mt-3 flex shrink-0 flex-col gap-1">
        {NAV_LINKS.map((item) => (
          <SideNavItem key={item.href} {...item} />
        ))}
        <SideNavItem label="Account settings" icon={UserIcon} onSelect={onSettings} />
      </nav>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <p className="px-2.5 pb-1 text-xs font-medium text-subtle">Recents</p>
        <ScrollArea edgeFade className="min-h-0 flex-1">
          {recentChats.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {recentChats.map((chat) => {
                const isActive = chat.id === activeChatId;
                return (
                  <div
                    key={chat.id}
                    className={cn(
                      "group flex items-center justify-between gap-1 rounded-xl px-2.5 py-1.5 transition-colors duration-150 ease-expo",
                      isActive
                        ? "bg-surface-hover font-medium text-foreground"
                        : "text-muted hover:bg-surface-hover hover:text-foreground"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectChat?.(chat.id)}
                      title={chat.title}
                      className="min-w-0 flex-1 truncate text-left text-sm"
                    >
                      {chat.title}
                    </button>
                    {onDeleteChat && (
                      <button
                        type="button"
                        aria-label={`Delete ${chat.title}`}
                        title="Delete conversation"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(chat.id);
                        }}
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-md text-subtle opacity-0 transition-all",
                          "hover:bg-red-500/10 hover:text-red-500 focus-visible:opacity-100 group-hover:opacity-100"
                        )}
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="px-2.5 py-3 text-xs text-subtle italic">No recent conversations</p>
          )}
        </ScrollArea>
      </div>

      {user ? (
        <div className="flex shrink-0 items-center gap-3 rounded-xl p-2">
          <UserAvatar name={user.name} image={user.image} size="sm" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {user.name}
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSignIn}
          title="Sign in"
          className={cn(
            "flex shrink-0 items-center gap-3 rounded-xl p-2 text-left",
            "transition-colors duration-150 ease-expo hover:bg-surface-hover"
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
            <HugeiconsIcon icon={UserIcon} size={14} strokeWidth={2.2} />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            Sign in
          </span>
        </button>
      )}
    </aside>
  );
}
