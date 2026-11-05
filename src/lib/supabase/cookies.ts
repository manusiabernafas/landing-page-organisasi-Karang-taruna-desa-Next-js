/** Cookie penanda "ingat sesi". Nilai "0" = sesi berakhir saat browser ditutup. */
export const REMEMBER_COOKIE = "bc-remember";

export function stripPersistence<T extends { maxAge?: number; expires?: Date | number | string }>(options: T): T {
  const next = { ...options };
  // Cookie penghapusan (maxAge 0) tetap dibiarkan agar logout berfungsi.
  if (next.maxAge !== 0) {
    delete next.maxAge;
    delete next.expires;
  }
  return next;
}
