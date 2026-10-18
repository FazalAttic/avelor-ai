"use client";

import {
  ArrowUpRight01Icon,
  Book03Icon,
  DashboardSquare01Icon,
  Logout03Icon,
  PackageIcon,
  Search01Icon,
  Shield01Icon,
  ShoppingBag01Icon,
  SidebarLeft01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { BrandMark } from "@/components/ui/brand-mark";
import { buttonClass } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { authClient, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type AdminUser = { name: string; email: string; image?: string | null };

const NAV: { href: string; label: string; icon: IconSvgElement }[] = [
  { href: "/admin", label: "Dashboard", icon: DashboardSquare01Icon },
  { href: "/admin/products", label: "Products", icon: PackageIcon },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag01Icon },
  { href: "/admin/policies", label: "AI policies", icon: Book03Icon },
  { href: "/admin/security", label: "Security", icon: Shield01Icon },
];

const TENANT = process.env.NEXT_PUBLIC_AVELOR_TENANT_ID ?? "store_alpha";

function roleOf(user: { role?: string } | undefined) {
  return user?.role;
}

function titleFor(pathname: string) {
  const match = NAV.find(
    (item) =>
      (item.href === "/admin" && pathname === "/admin") ||
      (item.href !== "/admin" && pathname.startsWith(item.href))
  );
  return match?.label ?? "Dashboard";
}

const GHOST_BUTTON = buttonClass({ variant: "secondary", size: "md" });

const PRIMARY_BUTTON = buttonClass({ variant: "primary", size: "md" });

const INK_BUTTON = buttonClass({ variant: "ink", size: "md" });

/**
 * Every admin page reads through this column, so the left and right gutters stay
 * put instead of the content stretching to whatever the viewport allows. The
 * top bar uses it too, which keeps the page title aligned with the cards below.
 */
const CONTENT_WIDTH = "mx-auto w-full max-w-[1240px] px-8 max-lg:px-5";

const RAIL_BUTTON =
  "flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-admin-ink transition-colors duration-150 ease-expo hover:bg-admin-line/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue max-lg:justify-center max-lg:px-0";

/* The rail is icon-only either because the viewport is narrow or because the
   admin collapsed it, so each rule has to answer to both triggers. */
const RAIL_TEXT = "max-lg:hidden group-data-[collapsed=true]/rail:hidden";
const RAIL_ICON_ROW =
  "max-lg:justify-center max-lg:px-0 group-data-[collapsed=true]/rail:justify-center group-data-[collapsed=true]/rail:px-0";

/* Rides the rail edge at the top, level with the logo, so it stays put whether
   the rail is 248px or 84px. Built like the metric cards it sits beside: card
   surface + soft edge, so it separates by tone and never by contrast. The glyph
   stays half-inked until hover, when the ring and the mark both come up to full. */
const RAIL_TOGGLE = cn(
  "absolute right-0 top-5 z-10 flex size-8 translate-x-1/2 items-center justify-center rounded-full",
  "border border-admin-edge bg-admin-card text-admin-ink/50",
  "transition-colors duration-200 ease-expo hover:border-admin-ink/25 hover:text-admin-ink",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
);

const RAIL_KEY = "avelor:admin-rail";

/* Same shape as the list controls in the pages below, but sized for the rail:
   card surface, soft edge, and the shortcut chip parked inside the right pad. */
const RAIL_SEARCH = cn(
  "h-9 w-full rounded-lg border border-admin-edge bg-admin-card pl-8.5 pr-10 text-[13px] text-admin-ink",
  "transition-colors duration-150 ease-expo placeholder:text-subtle",
  "focus:border-admin-ink/30 focus:outline-none",
  "[&::-webkit-search-cancel-button]:appearance-none"
);

const RAIL_KBD =
  "pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-admin-edge px-1.5 py-0.5 text-[10px] leading-none font-medium text-muted";

function readCollapsed() {
  try {
    return localStorage.getItem(RAIL_KEY) === "collapsed";
  } catch {
    return false;
  }
}

function writeCollapsed(next: boolean) {
  try {
    localStorage.setItem(RAIL_KEY, next ? "collapsed" : "expanded");
  } catch {
    // Private mode — the rail just resets to expanded next load
  }
}

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: IconSvgElement;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-[15px] tracking-tight",
        "transition-colors duration-150 ease-expo",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue",
        RAIL_ICON_ROW,
        active
          ? "border border-admin-edge bg-admin-card text-admin-ink font-semibold"
          : "border border-transparent font-medium text-admin-ink hover:bg-admin-card/70"
      )}
    >
      <HugeiconsIcon icon={icon} size={20} strokeWidth={active ? 2.1 : 1.8} className="shrink-0" />
      <span className={cn("truncate", RAIL_TEXT)}>{label}</span>
    </Link>
  );
}

function AdminShell({ user, children }: { user: AdminUser; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [query, setQuery] = useState("");
  const [shortcut, setShortcut] = useState("Ctrl K");
  const searchRef = useRef<HTMLInputElement>(null);
  const focusWhenOpen = useRef(false);

  const needle = query.trim().toLowerCase();
  const items = needle ? NAV.filter((item) => item.label.toLowerCase().includes(needle)) : NAV;

  function setRailCollapsed(next: boolean) {
    setCollapsed(next);
    writeCollapsed(next);
  }

  function toggleRail() {
    setRailCollapsed(!collapsed);
  }

  /* The field only exists while the rail is open, so a shortcut fired from the
     collapsed state has to ask for focus on the render that opens it. */
  const openSearch = useCallback(() => {
    focusWhenOpen.current = true;
    setCollapsed(false);
    writeCollapsed(false);
  }, []);

  useEffect(() => {
    if (/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent)) {
      setShortcut("⌘ K");
    }
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openSearch]);

  useEffect(() => {
    if (collapsed || !focusWhenOpen.current) return;
    focusWhenOpen.current = false;
    searchRef.current?.focus();
  }, [collapsed]);

  /* A stale filter left over from the previous screen makes the rail look broken
     the moment you land somewhere by other means. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: the route change is the trigger
  useEffect(() => {
    setQuery("");
  }, [pathname]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    await authClient.signOut();
    router.replace("/admin/login");
  }

  return (
    <div id="admin-shell" className="flex min-h-screen bg-admin-canvas text-foreground">
      <aside
        data-collapsed={collapsed}
        className={cn(
          "group/rail admin-edge sticky top-0 flex h-dvh shrink-0 flex-col gap-1 bg-admin-rail px-4 py-5",
          "transition-[width] duration-300 ease-expo max-lg:w-[74px]",
          collapsed ? "w-[84px]" : "w-[248px]"
        )}
      >
        <button
          type="button"
          onClick={toggleRail}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={RAIL_TOGGLE}
        >
          <HugeiconsIcon icon={SidebarLeft01Icon} size={16} strokeWidth={1.7} />
        </button>

        <Link
          href="/admin"
          title="Avelor Admin"
          className={cn("flex min-w-0 px-3 pb-6", RAIL_ICON_ROW)}
        >
          <BrandMark caption="Admin" wordmarkClassName={RAIL_TEXT} />
        </Link>

        <div className={cn("relative mb-2", collapsed ? "hidden" : "max-lg:hidden")}>
          <HugeiconsIcon
            icon={Search01Icon}
            size={15}
            strokeWidth={1.9}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            placeholder="Search"
            aria-label="Search the console"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && items[0]) router.push(items[0].href);
              if (event.key === "Escape") {
                setQuery("");
                event.currentTarget.blur();
              }
            }}
            className={RAIL_SEARCH}
          />
          <kbd className={RAIL_KBD}>{shortcut}</kbd>
        </div>

        <button
          type="button"
          onClick={openSearch}
          aria-label="Search the console"
          title="Search the console"
          className={cn(
            "mb-2 hidden h-9 shrink-0 items-center justify-center rounded-lg border border-admin-edge bg-admin-card",
            "transition-colors duration-150 ease-expo hover:border-admin-ink/25",
            collapsed ? "flex" : "max-lg:flex"
          )}
        >
          <HugeiconsIcon icon={Search01Icon} size={15} strokeWidth={1.9} className="text-muted" />
        </button>

        <p className={cn("px-3 pb-1 text-[11px] font-medium text-muted", RAIL_TEXT)}>Menu</p>

        {items.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href || pathname.startsWith(`${item.href}/`)
            }
          />
        ))}

        {items.length === 0 ? (
          <p className={cn("px-3 py-2 text-[13px] text-muted", RAIL_TEXT)}>No match</p>
        ) : null}

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <div
            className={cn("flex flex-col gap-2.5 rounded-xl bg-admin-card p-3 pt-2.5", RAIL_TEXT)}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <UserAvatar name={user.name} image={user.image} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm leading-tight font-semibold text-admin-ink">
                  {user.name}
                </span>
                <span className="block truncate text-xs leading-tight text-muted">
                  {user.email}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className={cn(RAIL_BUTTON, "bg-admin-rail text-[13px] hover:bg-admin-line/70")}
            >
              <HugeiconsIcon icon={Logout03Icon} size={17} strokeWidth={1.9} className="shrink-0" />
              <span>{signingOut ? "Signing out…" : "Log out"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            title="Log out"
            aria-label="Log out"
            className={cn(
              RAIL_BUTTON,
              "hidden max-lg:flex group-data-[collapsed=true]/rail:flex",
              RAIL_ICON_ROW
            )}
          >
            <HugeiconsIcon icon={Logout03Icon} size={19} strokeWidth={1.9} className="shrink-0" />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="h-16 shrink-0">
          <div className={cn(CONTENT_WIDTH, "flex h-full items-center justify-between gap-4")}>
            <div className="flex min-w-0 items-center gap-2.5">
              <h1 className="truncate text-[15px] font-semibold tracking-tight">
                {titleFor(pathname)}
              </h1>
              <Badge className="max-sm:hidden">{TENANT}</Badge>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link href="/" className={INK_BUTTON}>
                <HugeiconsIcon icon={ArrowUpRight01Icon} size={15} strokeWidth={2} />
                <span className="max-sm:hidden">View storefront</span>
                <span className="sm:hidden">Store</span>
              </Link>
            </div>
          </div>
        </header>

        <main id="admin-main" className="min-w-0 flex-1 py-6 max-lg:py-5">
          <div className={CONTENT_WIDTH}>{children}</div>
        </main>
      </div>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-admin-canvas">
      <aside className="w-[248px] shrink-0 bg-admin-rail p-5 max-lg:w-[74px]">
        <div className="size-8 animate-pulse rounded-[10px] bg-admin-line" />
        <div className="mt-7 flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="h-11 animate-pulse rounded-xl bg-admin-line" />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="h-16 shrink-0" />
        <main className="flex flex-col gap-3 p-6">
          <div className="h-7 w-44 animate-pulse rounded-lg bg-admin-line" />
          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="h-32 animate-pulse rounded-2xl bg-admin-card" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-admin-card" />
        </main>
      </div>
    </div>
  );
}

function Forbidden() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-7 text-center shadow-card">
        <span className="flex size-11 items-center justify-center rounded-full bg-brand-wash text-brand-blue">
          <HugeiconsIcon icon={Shield01Icon} size={22} strokeWidth={1.8} />
        </span>
        <h2 className="text-base font-bold tracking-tight">Administrators only</h2>
        <p className="text-sm leading-relaxed text-muted">
          This account doesn&apos;t have store admin rights. Sign in with an admin profile, or head
          back to the storefront.
        </p>
        <div className="mt-1 flex gap-2">
          <Link href="/admin/login" className={PRIMARY_BUTTON}>
            Try another account
          </Link>
          <Link href="/" className={GHOST_BUTTON}>
            Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isPending) return;

    if (!session && !isLoginPage) {
      router.replace("/admin/login");
      return;
    }

    if (session?.user && roleOf(session.user as { role?: string }) !== "admin") {
      // User is authenticated but is not an admin
      if (!isLoginPage) {
        router.replace("/admin/login?error=unauthorized");
      }
    }
  }, [session, isPending, isLoginPage, router]);

  if (isLoginPage) {
    return <div id="admin-login-shell">{children}</div>;
  }

  if (isPending) return <ShellSkeleton />;

  const user = session?.user as (AdminUser & { role?: string }) | undefined;

  if (!session || !user || roleOf(user) !== "admin") return <Forbidden />;

  return <AdminShell user={user}>{children}</AdminShell>;
}
