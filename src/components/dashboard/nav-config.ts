import type { Permission } from "@/lib/permissions";

export type NavIcon =
  | "basecamp"
  | "finance"
  | "dues"
  | "arisan"
  | "events"
  | "inventory"
  | "borrowings"
  | "members"
  | "documentation"
  | "achievements"
  | "reports"
  | "notifications"
  | "settings";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  permission?: Permission;
  match?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Basecamp", icon: "basecamp", match: "^/dashboard$" },
  { href: "/dashboard/finance", label: "Keuangan", icon: "finance", permission: "finance.view" },
  { href: "/dashboard/dues", label: "Iuran", icon: "dues" },
  { href: "/dashboard/events", label: "Event", icon: "events" },
  { href: "/dashboard/inventory", label: "Inventaris", icon: "inventory" },
  { href: "/dashboard/borrowings", label: "Peminjaman", icon: "borrowings" },
  { href: "/dashboard/members", label: "Anggota", icon: "members" },
  { href: "/dashboard/arisan", label: "Arisan Rapat", icon: "arisan" },
  { href: "/dashboard/documentation", label: "Dokumentasi", icon: "documentation" },
  { href: "/dashboard/achievements", label: "Achievement", icon: "achievements" },
  { href: "/dashboard/reports", label: "Laporan", icon: "reports", permission: "reports.view" },
  { href: "/dashboard/notifications", label: "Notifikasi", icon: "notifications" },
  { href: "/dashboard/settings", label: "Pengaturan", icon: "settings" },
];
