import type { OrgMetrics } from "@/types/db";

/**
 * Basecamp Level: visualisasi perkembangan ORGANISASI (bukan penilaian individu).
 * XP dihitung sederhana dari aktivitas yang tercatat.
 */
export const XP_WEIGHTS: Record<keyof OrgMetrics, { weight: number; label: string }> = {
  events_completed: { weight: 60, label: "Event selesai" },
  activities_completed: { weight: 25, label: "Kegiatan terlaksana" },
  transactions: { weight: 3, label: "Transaksi tercatat" },
  inventory_units: { weight: 2, label: "Unit inventaris terkelola" },
  inventory_items: { weight: 0, label: "Jenis barang" },
  members_active: { weight: 6, label: "Anggota aktif" },
  documents: { weight: 5, label: "Foto dokumentasi" },
  tasks_done: { weight: 2, label: "Quest selesai" },
  borrowings_returned: { weight: 4, label: "Peminjaman tuntas" },
};

const THRESHOLDS = [0, 300, 700, 1200, 1800, 2600, 3600, 5000, 7000];
const TITLES = [
  "Pos Ronda",
  "Gardu Pemuda",
  "Sekretariat",
  "Basecamp Aktif",
  "Basecamp Juara",
  "Pusat Kegiatan",
  "Kampung Hebat",
  "Legenda Kwarasan",
  "Legenda Kwarasan",
];
const MESSAGES = [
  "Basecamp baru dibangun. Yuk mulai kegiatan pertama!",
  "Basecamp mulai ramai!",
  "Basecamp makin tertata!",
  "Basecamp semakin aktif!",
  "Basecamp jadi kebanggaan kampung!",
  "Basecamp jadi pusat kegiatan warga!",
  "Basecamp luar biasa hidup!",
  "Basecamp legendaris!",
  "Basecamp legendaris!",
];

export function computeLevel(metrics: Partial<OrgMetrics> | null | undefined) {
  const m = metrics ?? {};
  let xp = 0;
  const breakdown: { key: keyof OrgMetrics; label: string; value: number; xp: number }[] = [];
  for (const key of Object.keys(XP_WEIGHTS) as (keyof OrgMetrics)[]) {
    const { weight, label } = XP_WEIGHTS[key];
    if (!weight) continue;
    const value = Number(m[key] ?? 0);
    xp += value * weight;
    breakdown.push({ key, label, value, xp: value * weight });
  }
  let level = 1;
  for (let i = 0; i < THRESHOLDS.length; i++) if (xp >= THRESHOLDS[i]) level = i + 1;
  const maxLevel = THRESHOLDS.length;
  const floor = THRESHOLDS[level - 1];
  const ceil = THRESHOLDS[level] ?? floor;
  const progress = level >= maxLevel ? 100 : Math.round(((xp - floor) / (ceil - floor)) * 100);
  return {
    xp,
    level,
    title: TITLES[level - 1],
    message: MESSAGES[level - 1],
    progress,
    nextAt: ceil,
    toNext: Math.max(0, ceil - xp),
    breakdown: breakdown.sort((a, b) => b.xp - a.xp),
  };
}
