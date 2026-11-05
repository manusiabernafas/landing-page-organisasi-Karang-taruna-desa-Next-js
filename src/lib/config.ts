export const SITE_NAME = "BASECAMP PEMUDA RW 05";
export const ORG_NAME = "Pemuda RW 05 Kwarasan";
export const ORG_LOCATION_SHORT = "Kwarasan • Nogotirto • Gamping • Sleman";
export const ORG_LOCATION_FULL = "Kwarasan, Nogotirto, Gamping, Sleman, Daerah Istimewa Yogyakarta";
export const TAGLINE = "Bangun Kegiatan. Kelola Kas. Gerakkan Pemuda.";
export const SUPPORTING_TEXT = "Satu basecamp untuk kegiatan, kas, inventaris, dan cerita Pemuda RW 05.";

export const ORG_SLUG = process.env.NEXT_PUBLIC_ORG_SLUG || "pemuda-rw05-kwarasan";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:6300").replace(/\/$/, "");

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export const UPLOAD_LIMITS = {
  imageMaxBytes: 5 * 1024 * 1024,
  avatarMaxBytes: 2 * 1024 * 1024,
  imageMimes: ["image/jpeg", "image/png", "image/webp"] as const,
  attachmentMimes: ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const,
};

export const PAGE_SIZE = 12;

/**
 * Mode demo: tampilkan akun demo di halaman login. Hanya untuk data contoh.
 * Matikan (NEXT_PUBLIC_DEMO_MODE=false) begitu data asli organisasi mulai dipakai.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
export const DEMO_ACCOUNTS = [
  { email: "superadmin@basecamp-rw05.test", role: "Super Admin", name: "Muhammad Rizky", note: "Semua akses" },
  { email: "pengurus@basecamp-rw05.test", role: "Pengurus", name: "Budi Santoso", note: "Event, inventaris, anggota" },
  { email: "bendahara@basecamp-rw05.test", role: "Bendahara", name: "Anisa Wulandari", note: "Kas & iuran" },
  { email: "panitia@basecamp-rw05.test", role: "Panitia", name: "Galih Prasetyo", note: "Panitia Gebyar" },
  { email: "anggota@basecamp-rw05.test", role: "Anggota", name: "Arif Wibowo", note: "Akses anggota" },
] as const;
