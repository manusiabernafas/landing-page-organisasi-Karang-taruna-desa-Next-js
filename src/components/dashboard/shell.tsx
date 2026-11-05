"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  Boxes,
  CalendarRange,
  Camera,
  Coins,
  Dices,
  FileBarChart,
  HandHelping,
  LayoutGrid,
  LogOut,
  Settings,
  Tent,
  Trophy,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { Wordmark } from "@/components/illustrations/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils/cn";
import type { AppRole } from "@/types/db";
import { NAV_ITEMS, type NavIcon } from "./nav-config";

const ICONS: Record<NavIcon, LucideIcon> = {
  basecamp: Tent,
  finance: Wallet,
  dues: Coins,
  arisan: Dices,
  events: CalendarRange,
  inventory: Boxes,
  borrowings: HandHelping,
  members: Users,
  documentation: Camera,
  achievements: Trophy,
  reports: FileBarChart,
  notifications: Bell,
  settings: Settings,
};

function isActive(pathname: string, href: string, match?: string) {
  if (match) return new RegExp(match).test(pathname);
  return pathname === href || pathname.startsWith(href + "/");
}

export function DashboardShell({
  children,
  user,
  unread,
}: {
  children: React.ReactNode;
  user: { name: string; role: AppRole; email: string | null; avatar: string | null };
  unread: number;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const items = NAV_ITEMS.filter((i) => !i.permission || can(user.role, i.permission));

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [drawer]);

  const bottom = [
    { href: "/dashboard", label: "Basecamp", icon: Tent, match: "^/dashboard$" },
    can(user.role, "finance.view")
      ? { href: "/dashboard/finance", label: "Kas", icon: Wallet }
      : { href: "/dashboard/borrowings", label: "Pinjam", icon: HandHelping },
    { href: "/dashboard/events", label: "Event", icon: CalendarRange },
    { href: "/dashboard/inventory", label: "Barang", icon: Boxes },
  ];

  const navList = (onNavigate?: () => void) => (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href, item.match);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors",
                active ? "bg-forest text-white dark:bg-grass-100 dark:text-text" : "text-muted hover:bg-bg-soft hover:text-text",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-lg transition-colors",
                  active ? "bg-gold text-forest" : "bg-transparent group-hover:bg-surface",
                )}
              >
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <span className="flex-1">{item.label}</span>
              {item.icon === "notifications" && unread > 0 ? (
                <span className="rounded-full bg-danger px-1.5 py-0.5 text-[11px] leading-none font-bold text-white tabular">
                  {unread > 99 ? "99+" : unread}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const userCard = (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
      <Avatar name={user.name} src={user.avatar} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{user.name}</p>
        <p className="truncate text-xs text-muted">{ROLE_LABEL[user.role]}</p>
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-danger-bg hover:text-danger"
          aria-label="Keluar"
          title="Keluar"
        >
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-dvh bg-bg">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">
        Lewati ke konten
      </a>
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-border bg-surface-2 lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/dashboard" aria-label="Basecamp">
            <Wordmark compact />
          </Link>
        </div>
        <nav aria-label="Menu basecamp" className="flex-1 overflow-y-auto px-3 py-3">
          {navList()}
        </nav>
        <div className="p-3">{userCard}</div>
      </aside>

      {/* Topbar */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-bg/85 backdrop-blur-md lg:ml-[264px]">
        <div className="flex h-14 items-center justify-between gap-2 px-4 sm:h-16 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="lg:hidden" aria-label="Basecamp">
            <Wordmark compact className="[&>span:last-child]:hidden min-[380px]:[&>span:last-child]:flex" />
          </Link>
          <p className="hidden text-sm font-semibold text-muted lg:block">Pemuda RW 05 Kwarasan · Command Center</p>
          <div className="flex items-center gap-1">
            <Link href="/" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-bg-soft hover:text-text sm:block">
              Lihat situs publik
            </Link>
            <ThemeToggle />
            <Link
              href="/dashboard/notifications"
              className="relative inline-flex size-10 items-center justify-center rounded-xl text-muted hover:bg-bg-soft hover:text-text"
              aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
            >
              <Bell className="size-5" />
              {unread > 0 ? (
                <span className="absolute top-1.5 right-1.5 flex min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-[18px] font-bold text-white ring-2 ring-bg tabular">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="px-4 pt-5 pb-28 sm:px-6 sm:pt-7 lg:ml-[264px] lg:px-8 lg:pb-12">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>

      {/* Bottom navigation mobile */}
      <nav
        aria-label="Navigasi bawah"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {bottom.map((b) => {
            const active = isActive(pathname, b.href, b.match);
            return (
              <li key={b.href}>
                <Link
                  href={b.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold", active ? "text-grass-600" : "text-muted")}
                >
                  <span className={cn("inline-flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-grass-100")}>
                    <b.icon className="size-5" aria-hidden />
                  </span>
                  {b.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-expanded={drawer}
              aria-controls="dashboard-drawer"
              className="relative flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-bold text-muted"
            >
              <span className="inline-flex h-7 w-12 items-center justify-center rounded-full">
                <LayoutGrid className="size-5" aria-hidden />
              </span>
              Menu
              {unread > 0 ? <span className="absolute top-2.5 right-[30%] size-2 rounded-full bg-danger" aria-hidden /> : null}
            </button>
          </li>
        </ul>
      </nav>

      {/* Drawer mobile */}
      {drawer ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu basecamp" id="dashboard-drawer">
          <button type="button" className="absolute inset-0 bg-forest/50 backdrop-blur-[2px]" aria-label="Tutup menu" onClick={() => setDrawer(false)} />
          <div className="anim-rise absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-surface-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between">
              <Wordmark compact />
              <button type="button" onClick={() => setDrawer(false)} className="inline-flex size-10 items-center justify-center rounded-xl hover:bg-bg-soft" aria-label="Tutup menu">
                <X className="size-5" />
              </button>
            </div>
            <nav aria-label="Menu basecamp seluler">{navList(() => setDrawer(false))}</nav>
            <div className="mt-3">{userCard}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
