export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok<T = undefined>(message?: string, data?: T): ActionResult<T> {
  return { ok: true, message, data };
}

export function fail(error: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/** Ubah error Supabase/Postgres menjadi pesan ramah tanpa stack trace. */
export function friendlyError(error: unknown, fallback = "Data belum berhasil disimpan. Coba lagi."): string {
  if (!error) return fallback;
  const e = error as { message?: string; code?: string };
  const msg = e.message ?? "";
  if (e.code === "23505") return "Data dengan kode/nama yang sama sudah ada.";
  if (e.code === "23503") return "Data ini masih dipakai data lain, jadi belum bisa diubah/dihapus.";
  if (e.code === "23514") return "Ada nilai yang tidak valid. Periksa kembali isian Anda.";
  if (e.code === "42501" || /row-level security|permission denied/i.test(msg)) {
    return msg && !/row-level security|permission denied/i.test(msg) ? msg : "Peran Anda belum punya izin untuk aksi ini.";
  }
  if (e.code === "P0001" && msg) return msg;
  // Pesan RAISE EXCEPTION dari fungsi database kita sudah berbahasa Indonesia.
  if (msg && !/^(JWT|fetch failed|TypeError)/.test(msg) && msg.length < 220 && !/syntax|relation|column|function .* does not exist/i.test(msg)) {
    return msg;
  }
  return fallback;
}
