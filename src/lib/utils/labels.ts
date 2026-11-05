import type {
  BorrowingStatus,
  EventStatus,
  FinanceType,
  ItemCondition,
  ItemStatus,
  MaintenanceStatus,
  MemberRole,
  PaymentMethod,
  UnitStatus,
} from "@/types/db";

export type Tone = "green" | "sky" | "gold" | "wood" | "red" | "gray";

export const EVENT_STATUS: Record<EventStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "gray" },
  PLANNING: { label: "Persiapan", tone: "sky" },
  READY: { label: "Siap", tone: "gold" },
  ONGOING: { label: "Berlangsung", tone: "green" },
  COMPLETED: { label: "Selesai", tone: "wood" },
  CANCELLED: { label: "Dibatalkan", tone: "red" },
};

export const UNIT_STATUS: Record<UnitStatus, { label: string; tone: Tone }> = {
  AVAILABLE: { label: "Tersedia", tone: "green" },
  BORROWED: { label: "Dipinjam", tone: "sky" },
  MAINTENANCE: { label: "Maintenance", tone: "gold" },
  DAMAGED: { label: "Rusak", tone: "red" },
  LOST: { label: "Hilang", tone: "gray" },
};

export const ITEM_STATUS: Record<ItemStatus, { label: string; tone: Tone }> = {
  AVAILABLE: { label: "Semua tersedia", tone: "green" },
  PARTIAL: { label: "Sebagian dipakai", tone: "gold" },
  BORROWED: { label: "Semua dipinjam", tone: "sky" },
  MAINTENANCE: { label: "Maintenance", tone: "red" },
  EMPTY: { label: "Belum ada unit", tone: "gray" },
  ARCHIVED: { label: "Diarsipkan", tone: "gray" },
};

export const CONDITION: Record<ItemCondition, { label: string; tone: Tone }> = {
  EXCELLENT: { label: "Sangat baik", tone: "green" },
  GOOD: { label: "Baik", tone: "sky" },
  FAIR: { label: "Cukup", tone: "gold" },
  DAMAGED: { label: "Rusak", tone: "red" },
  LOST: { label: "Hilang", tone: "gray" },
};

export const BORROWING_STATUS: Record<BorrowingStatus, { label: string; tone: Tone }> = {
  REQUESTED: { label: "Menunggu persetujuan", tone: "gold" },
  APPROVED: { label: "Disetujui", tone: "sky" },
  BORROWED: { label: "Dipinjam", tone: "green" },
  RETURNED: { label: "Dikembalikan", tone: "wood" },
  REJECTED: { label: "Ditolak", tone: "red" },
  CANCELLED: { label: "Dibatalkan", tone: "gray" },
};

export const MAINTENANCE_STATUS: Record<MaintenanceStatus, { label: string; tone: Tone }> = {
  OPEN: { label: "Menunggu", tone: "gold" },
  IN_PROGRESS: { label: "Diperbaiki", tone: "sky" },
  DONE: { label: "Selesai", tone: "green" },
};

export const FINANCE_TYPE: Record<FinanceType, { label: string; tone: Tone }> = {
  INCOME: { label: "Pemasukan", tone: "green" },
  EXPENSE: { label: "Pengeluaran", tone: "red" },
  TRANSFER: { label: "Transfer", tone: "sky" },
};

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  CASH: "Tunai",
  TRANSFER: "Transfer bank",
  QRIS: "QRIS",
  EWALLET: "E-wallet",
  OTHER: "Lainnya",
};

export const MEMBER_ROLE: Record<MemberRole, string> = {
  KETUA: "Ketua",
  WAKIL: "Wakil Ketua",
  SEKRETARIS: "Sekretaris",
  BENDAHARA: "Bendahara",
  KOORDINATOR: "Koordinator",
  ANGGOTA: "Anggota",
};
