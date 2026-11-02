"use client";

import {
  Chat01Icon,
  Delete02Icon,
  Edit01Icon,
  FavouriteIcon,
  PackageIcon,
  ShoppingBag01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ScrollArea } from "@/components/scroll-area";
import { SideNavItem } from "@/components/side-nav-item";
import { SoundToggle } from "@/components/sound-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { useSession } from "@/lib/auth-client";
import { useCart } from "@/lib/cart-context";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export type RecentChat = { id: string; title: string };

const STARTER_EMOJIS: Record<string, string> = {
  "running shoes under $100": "👟",
  "a gift for a gamer": "🎮",
  "cozy hoodie weather": "🧥",
};

const KEYWORD_EMOJI_RULES: Array<{ keywords: string[]; emoji: string }> = [
  {
    keywords: [
      "shoe",
      "shoes",
      "sneaker",
      "sneakers",
      "kicks",
      "runner",
      "running",
      "boot",
      "boots",
      "slides",
      "sandals",
      "loafers",
      "heels",
      "footwear",
    ],
    emoji: "👟",
  },
  {
    keywords: [
      "game",
      "gamer",
      "gaming",
      "playstation",
      "ps5",
      "xbox",
      "nintendo",
      "switch",
      "controller",
      "steam",
    ],
    emoji: "🎮",
  },
  {
    keywords: [
      "hoodie",
      "hoodies",
      "sweater",
      "sweaters",
      "jacket",
      "jackets",
      "coat",
      "coats",
      "fleece",
      "sweatshirt",
      "pullover",
      "windbreaker",
    ],
    emoji: "🧥",
  },
  {
    keywords: [
      "shirt",
      "shirts",
      "tee",
      "tees",
      "t-shirt",
      "polo",
      "tank",
      "jersey",
      "top",
      "tops",
    ],
    emoji: "👕",
  },
  {
    keywords: ["pants", "jeans", "shorts", "sweatpants", "joggers", "trousers", "leggings"],
    emoji: "👖",
  },
  {
    keywords: ["cap", "caps", "hat", "hats", "beanie", "beanies", "visor"],
    emoji: "🧢",
  },
  {
    keywords: ["watch", "watches", "smartwatch", "apple watch", "rolex", "clock"],
    emoji: "⌚",
  },
  {
    keywords: ["backpack", "backpacks", "bag", "bags", "tote", "duffel", "luggage", "suitcase"],
    emoji: "🎒",
  },
  {
    keywords: [
      "headphone",
      "headphones",
      "airpod",
      "airpods",
      "earbuds",
      "earphones",
      "audio",
      "speaker",
      "headset",
    ],
    emoji: "🎧",
  },
  {
    keywords: ["sunglasses", "glasses", "shades", "eyewear"],
    emoji: "🕶️",
  },
  {
    keywords: ["gift", "gifts", "present", "presents", "birthday", "anniversary"],
    emoji: "🎁",
  },
  {
    keywords: [
      "phone",
      "iphone",
      "samsung",
      "pixel",
      "laptop",
      "macbook",
      "ipad",
      "tablet",
      "camera",
    ],
    emoji: "📱",
  },
  {
    keywords: ["perfume", "cologne", "fragrance", "scent", "skincare", "makeup", "cosmetics"],
    emoji: "✨",
  },
  {
    keywords: [
      "ring",
      "necklace",
      "bracelet",
      "earring",
      "jewelry",
      "jewellery",
      "gold",
      "silver",
      "diamond",
    ],
    emoji: "💍",
  },
  {
    keywords: [
      "gym",
      "workout",
      "fitness",
      "training",
      "tennis",
      "basketball",
      "soccer",
      "football",
      "sport",
      "sports",
    ],
    emoji: "⚽",
  },
  {
    keywords: [
      "deal",
      "deals",
      "sale",
      "discount",
      "cheap",
      "clearance",
      "budget",
      "under $",
      "under 100",
    ],
    emoji: "🏷️",
  },
];

export function getChatEmoji(title: string): string | null {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return null;

  // Direct starter match
  if (STARTER_EMOJIS[normalized]) {
    return STARTER_EMOJIS[normalized];
  }

  // If title already contains an emoji at the start
  const leadingEmoji = title.match(/^(\p{Extended_Pictographic})/u);
  if (leadingEmoji?.[1]) {
    return leadingEmoji[1];
  }

  // Keyword rules
  for (const rule of KEYWORD_EMOJI_RULES) {
    for (const kw of rule.keywords) {
      const regex = new RegExp(`\\b${kw}`, "i");
      if (regex.test(normalized)) {
        return rule.emoji;
      }
    }
  }

  return null;
}

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
  const { itemCount, openDrawer } = useCart();
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
        onClick={() => {
          sound.pop();
          onNewChat();
        }}
        className={cn(
          "btn-brand flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        )}
      >
        <HugeiconsIcon icon={Edit01Icon} size={18} strokeWidth={2} className="shrink-0" />
        New chat
      </button>

      <nav aria-label="Main" className="mt-3 flex shrink-0 flex-col gap-1">
        <SideNavItem
          label="Checkout"
          icon={ShoppingBag01Icon}
          onSelect={() => {
            sound.click();
            openDrawer();
          }}
          badge={itemCount > 0 ? itemCount : undefined}
        />
        <SideNavItem label="Favourites" icon={FavouriteIcon} href="/favourites" />
        <SideNavItem label="Orders" icon={PackageIcon} href="/orders" />
        <SideNavItem label="Account settings" icon={UserIcon} onSelect={onSettings} />
      </nav>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <p className="px-2.5 pb-1 text-xs font-medium text-subtle">Recents</p>
        <ScrollArea edgeFade className="min-h-0 flex-1">
          {recentChats.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {recentChats.map((chat) => {
                const isActive = chat.id === activeChatId;
                const emoji = getChatEmoji(chat.title);
                return (
                  <div
                    key={chat.id}
                    className={cn(
                      "group flex items-center justify-between gap-1.5 rounded-xl px-2.5 py-2 transition-all duration-150 ease-expo",
                      isActive
                        ? "bg-brand-blue/10 text-brand-blue font-medium shadow-sm"
                        : "text-muted hover:bg-surface-hover hover:text-foreground"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        sound.click();
                        onSelectChat?.(chat.id);
                      }}
                      title={chat.title}
                      className="flex min-w-0 flex-1 items-center gap-2 truncate text-left text-sm"
                    >
                      {emoji ? (
                        <span
                          aria-hidden
                          className="flex size-4 shrink-0 items-center justify-center text-[13px] leading-none select-none"
                        >
                          {emoji}
                        </span>
                      ) : (
                        <HugeiconsIcon
                          icon={Chat01Icon}
                          size={15}
                          strokeWidth={1.8}
                          className={cn(
                            "shrink-0 transition-colors",
                            isActive ? "text-brand-blue" : "text-subtle group-hover:text-muted"
                          )}
                        />
                      )}
                      <span className="truncate">{chat.title}</span>
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
                          "flex size-6 shrink-0 items-center justify-center rounded-lg text-subtle opacity-0 transition-all duration-150",
                          "hover:bg-red-500/10 hover:text-red-500 focus-visible:opacity-100 group-hover:opacity-100"
                        )}
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={13} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-full flex-col items-center justify-center px-5 py-5 text-center">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-wash text-foreground">
                <HugeiconsIcon icon={Chat01Icon} size={19} strokeWidth={1.7} />
              </span>
              <p className="pt-3.5 text-[13px] font-medium text-muted">
                {user ? "No conversations yet" : "Nothing saved yet"}
              </p>
              <p className="max-w-[22ch] pt-1 text-[12px] leading-[1.55] text-subtle">
                {user ? (
                  "Chats you start collect here so you can pick one back up."
                ) : (
                  <>
                    Threads are kept per account.{" "}
                    <button
                      type="button"
                      onClick={onSignIn}
                      className="cursor-pointer font-medium text-muted underline decoration-border-strong underline-offset-2 transition-colors duration-150 ease-expo hover:text-brand-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                    >
                      Sign in
                    </button>{" "}
                    to keep yours.
                  </>
                )}
              </p>
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 pt-2">
        {user ? (
          <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1.5">
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
              "flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1.5 text-left",
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

        <div className="flex shrink-0 items-center gap-1 sm:hidden">
          <ThemeToggle
            iconSize={18}
            className="size-9 border border-border/50 bg-background/50 shadow-none hover:bg-surface-hover dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          />
          <SoundToggle
            iconSize={18}
            className="size-9 border border-border/50 bg-background/50 shadow-none hover:bg-surface-hover dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          />
        </div>
      </div>
    </aside>
  );
}
