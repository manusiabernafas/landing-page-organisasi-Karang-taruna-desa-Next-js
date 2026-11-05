/** Tanggal hari ini (WIB) untuk komponen client, format yyyy-MM-dd. */
export function todayJakartaClient() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
