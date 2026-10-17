"use client";

import {
  ArrowUpRight01Icon,
  Book03Icon,
  DashboardSquare01Icon,
  Logout03Icon,
  PackageIcon,
  Settings01Icon,
  Shield01Icon,
  ShoppingBag01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
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

const RAIL_BUTTON =
  "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-muted transition-colors duration-150 ease-expo hover:bg-admin-line/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue max-lg:justify-center max-lg:px-0";

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
        "flex h-10 shrink-0 items-center gap-3 rounded-xl px-2.5 text-sm font-medium",
        "transition-colors duration-150 ease-expo max-lg:justify-center max-lg:px-0",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue",
        active
          ? "bg-admin-card text-admin-ink shadow-card"
          : "text-muted hover:bg-admin-line/60 hover:text-foreground"
      )}
    >
      <HugeiconsIcon icon={icon} size={18} strokeWidth={active ? 2 : 1.7} className="shrink-0" />
      <span className="truncate max-lg:hidden">{label}</span>
    </Link>
  );
}

function AdminShell({ user, children }: { user: AdminUser; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    await authClient.signOut();
    router.replace("/admin/login");
  }

  return (
    <div id="admin-shell" className="flex min-h-screen bg-admin-canvas text-foreground">
      <aside className="sticky top-0 flex h-dvh w-[248px] shrink-0 flex-col gap-1 border-r border-admin-line bg-admin-rail px-3 py-4 max-lg:w-[74px]">
        <Link href="/admin" title="Avelor Admin" className="px-1.5 pb-5 max-lg:px-0">
          <BrandMark caption="Admin" wordmarkClassName="max-lg:hidden" />
        </Link>

        <p className="px-2.5 pb-1.5 text-[10px] font-semibold tracking-[0.14em] text-subtle uppercase max-lg:hidden">
          Manage
        </p>

        {NAV.map((item) => (
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

        <div className="mt-auto flex flex-col gap-1 pt-4">
          <Link href="/admin/security" title="Security" className={RAIL_BUTTON}>
            <HugeiconsIcon icon={Settings01Icon} size={17} strokeWidth={1.8} className="shrink-0" />
            <span className="max-lg:hidden">Settings</span>
          </Link>

          <div className="flex flex-col gap-2.5 rounded-xl border border-admin-line bg-admin-card p-2.5 max-lg:hidden">
            <div className="flex min-w-0 items-center gap-2.5">
              <UserAvatar name={user.name} image={user.image} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-[13px] leading-tight font-semibold">
                  {user.name}
                </span>
                <span className="block truncate text-[11px] leading-tight text-subtle">
                  {user.email}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className={cn(RAIL_BUTTON, "border border-admin-line disabled:opacity-60")}
            >
              <HugeiconsIcon icon={Logout03Icon} size={17} strokeWidth={1.8} className="shrink-0" />
              <span>{signingOut ? "Signing out…" : "Log out"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            title="Log out"
            aria-label="Log out"
            className={cn(RAIL_BUTTON, "max-lg:mt-1 lg:hidden")}
          >
            <HugeiconsIcon icon={Logout03Icon} size={17} strokeWidth={1.8} className="shrink-0" />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-admin-line px-6 max-lg:px-4">
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
        </header>

        <main id="admin-main" className="min-w-0 flex-1 px-6 py-6 max-lg:px-4 max-lg:py-5">
          {children}
        </main>
      </div>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-admin-canvas">
      <aside className="w-[248px] shrink-0 border-r border-admin-line bg-admin-rail p-4 max-lg:w-[74px]">
        <div className="size-8 animate-pulse rounded-[10px] bg-admin-line" />
        <div className="mt-6 flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="h-10 animate-pulse rounded-xl bg-admin-line" />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="h-16 shrink-0 border-b border-admin-line" />
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
