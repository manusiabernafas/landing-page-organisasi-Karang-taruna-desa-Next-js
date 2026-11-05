import type { AppRole } from "@/types/db";

/** Matriks izin UI. Otorisasi final tetap di RLS & fungsi database. */
export const PERMISSIONS = {
  "finance.view": ["SUPER_ADMIN", "PENGURUS", "BENDAHARA"],
  "finance.create": ["SUPER_ADMIN", "PENGURUS", "BENDAHARA"],
  "finance.approve": ["SUPER_ADMIN", "BENDAHARA"],
  "finance.manage": ["SUPER_ADMIN", "BENDAHARA"],
  "event.create": ["SUPER_ADMIN", "PENGURUS"],
  "event.delete": ["SUPER_ADMIN"],
  "inventory.manage": ["SUPER_ADMIN", "PENGURUS"],
  "borrowing.approve": ["SUPER_ADMIN", "PENGURUS"],
  "borrowing.request": ["SUPER_ADMIN", "PENGURUS", "BENDAHARA", "PANITIA", "ANGGOTA"],
  "members.manage": ["SUPER_ADMIN", "PENGURUS"],
  "members.private": ["SUPER_ADMIN", "PENGURUS"],
  "documents.upload": ["SUPER_ADMIN", "PENGURUS", "PANITIA"],
  "reports.view": ["SUPER_ADMIN", "PENGURUS", "BENDAHARA"],
  "audit.view": ["SUPER_ADMIN", "PENGURUS", "BENDAHARA"],
  "settings.manage": ["SUPER_ADMIN"],
  "dues.view": ["SUPER_ADMIN", "PENGURUS", "BENDAHARA"],
  "dues.pay": ["SUPER_ADMIN", "BENDAHARA"],
  "households.manage": ["SUPER_ADMIN", "PENGURUS", "BENDAHARA"],
  "arisan.manage": ["SUPER_ADMIN", "PENGURUS"],
} as const satisfies Record<string, readonly AppRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: AppRole | null | undefined, permission: Permission) {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly AppRole[]).includes(role);
}

export const ROLE_LABEL: Record<AppRole, string> = {
  SUPER_ADMIN: "Super Admin",
  PENGURUS: "Pengurus",
  BENDAHARA: "Bendahara",
  PANITIA: "Panitia",
  ANGGOTA: "Anggota",
};
