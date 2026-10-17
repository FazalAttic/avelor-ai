"use client";

import {
  ArrowLeft02Icon,
  Book03Icon,
  DashboardSquare01Icon,
  Logout03Icon,
  PackageIcon,
  Shield01Icon,
  ShoppingBag01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { authClient, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type AdminUser = { name: string; email: string; image?: string | null };

const NAV: { href: string; label: string; icon: IconSvgElement }[] = [
  { href: "/admin", label: "Overview", icon: DashboardSquare01Icon },
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
  return match?.label ?? "Overview";
}

const GHOST_BUTTON = cn(
  "flex h-9 items-center justify-center gap-2 rounded-full border border-border px-3.5 text-[13px] font-semibold text-muted",
  "transition-colors duration-150 ease-expo hover:border-border-strong hover:bg-surface-hover hover:text-foreground",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue",
  "disabled:pointer-events-none disabled:opacity-50"
);

const PRIMARY_BUTTON = cn(
  "flex h-9 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-semibold text-white",
  "bg-[image:var(--gradient-brand)] shadow-card",
  "transition-opacity duration-150 ease-expo hover:opacity-90",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue",
  "disabled:pointer-events-none disabled:opacity-50"
);

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
        "relative flex h-10 shrink-0 items-center gap-3 rounded-xl px-2.5 text-sm font-medium",
        "transition-colors duration-150 ease-expo max-lg:justify-center max-lg:px-0",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue",
        active
          ? "bg-brand-wash text-brand-blue"
          : "text-muted hover:bg-surface-hover hover:text-foreground"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 -left-3 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-blue",
          "transition-opacity duration-150 ease-expo",
          active ? "opacity-100" : "opacity-0"
        )}
      />
      <HugeiconsIcon icon={icon} size={18} strokeWidth={1.8} className="shrink-0" />
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
    <div id="admin-shell" className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-[236px] shrink-0 flex-col gap-1 border-r border-border bg-surface px-3 py-4 max-lg:w-[74px]">
        <Link
          href="/admin"
          title="Avelor Admin"
          className="flex items-center gap-2.5 rounded-xl px-1.5 pb-4 max-lg:justify-center max-lg:px-0"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[image:var(--gradient-brand)] text-[13px] font-extrabold text-white">
            A
          </span>
          <span className="min-w-0 flex-1 text-left max-lg:hidden">
            <span className="block truncate text-[13px] leading-tight font-bold tracking-tight">
              Avelor
            </span>
            <span className="block truncate text-[10px] leading-tight font-semibold tracking-[0.14em] text-subtle uppercase">
              Admin
            </span>
          </span>
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

        <Link href="/" title="View storefront" className={cn(GHOST_BUTTON, "mt-auto max-lg:px-0")}>
          <HugeiconsIcon icon={ArrowLeft02Icon} size={16} strokeWidth={1.8} className="shrink-0" />
          <span className="max-lg:hidden">Storefront</span>
        </Link>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border px-6 max-lg:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <h1 className="truncate text-[15px] font-bold tracking-tight">{titleFor(pathname)}</h1>
            <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-subtle max-sm:hidden">
              {TENANT}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-2.5 rounded-full border border-border bg-surface py-1.5 pr-3.5 pl-1.5">
              <UserAvatar name={user.name} image={user.image} size="sm" />
              <span className="min-w-0 text-left">
                <span className="block max-w-[140px] truncate text-[13px] leading-tight font-semibold">
                  {user.name}
                </span>
                <span className="block max-w-[140px] truncate text-[11px] leading-tight text-subtle max-sm:hidden">
                  {user.email}
                </span>
              </span>
              <span className="rounded-full bg-brand-wash px-2 py-0.5 text-[10px] font-bold tracking-wide text-brand-blue uppercase">
                Admin
              </span>
            </div>

            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className={cn(GHOST_BUTTON, "max-sm:px-2.5")}
            >
              <HugeiconsIcon icon={Logout03Icon} size={16} strokeWidth={1.8} className="shrink-0" />
              <span className="max-sm:hidden">{signingOut ? "Signing out…" : "Sign out"}</span>
            </button>
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
    <div className="flex min-h-screen bg-background">
      <aside className="w-[236px] shrink-0 border-r border-border bg-surface p-4 max-lg:w-[74px]">
        <div className="size-8 animate-pulse rounded-[10px] bg-surface-hover" />
        <div className="mt-6 flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="h-10 animate-pulse rounded-xl bg-surface-hover" />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="h-16 shrink-0 border-b border-border" />
        <main className="flex flex-col gap-3 p-6">
          <div className="h-7 w-44 animate-pulse rounded-lg bg-surface-hover" />
          <div className="h-40 animate-pulse rounded-2xl bg-surface-hover" />
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
