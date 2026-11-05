import { differenceInCalendarDays, format, formatDistanceToNowStrict } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { TZDate } from "@date-fns/tz";

export const TZ = "Asia/Jakarta";

export function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

const rupiahFmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const numberFmt = new Intl.NumberFormat("id-ID");

export function rupiah(value: number | string | null | undefined) {
  return rupiahFmt.format(toNumber(value)).replace(/ /g, " ");
}

export function rupiahShort(value: number | string | null | undefined) {
  const n = toNumber(value);
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1_000_000) return `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (abs >= 1_000) return `Rp ${(n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
  return rupiah(n);
}

export function num(value: number | string | null | undefined) {
  return numberFmt.format(toNumber(value));
}

function zoned(date: string | Date) {
  return new TZDate(typeof date === "string" ? new Date(date) : date, TZ);
}

/** Untuk kolom DATE (YYYY-MM-DD) tanpa pergeseran zona waktu. */
function plainDate(date: string) {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function fmtDate(date: string | Date | null | undefined, pattern = "d MMM yyyy") {
  if (!date) return "-";
  const d = typeof date === "string" && date.length === 10 ? plainDate(date) : zoned(date);
  return format(d, pattern, { locale: localeId });
}

export function fmtDateTime(date: string | Date | null | undefined) {
  if (!date) return "-";
  return format(zoned(date), "d MMM yyyy, HH.mm", { locale: localeId });
}

export function fmtTime(date: string | Date | null | undefined) {
  if (!date) return "-";
  return format(zoned(date), "HH.mm", { locale: localeId });
}

export function fromNow(date: string | Date) {
  return formatDistanceToNowStrict(typeof date === "string" ? new Date(date) : date, { locale: localeId, addSuffix: true });
}

export function todayJakarta() {
  return format(new TZDate(new Date(), TZ), "yyyy-MM-dd");
}

export function daysUntil(date: string | Date) {
  const target = typeof date === "string" && date.length === 10 ? plainDate(date) : zoned(date);
  const now = new TZDate(new Date(), TZ);
  return differenceInCalendarDays(
    new Date(target.getFullYear(), target.getMonth(), target.getDate()),
    new Date(now.getFullYear(), now.getMonth(), now.getDate()),
  );
}

export function countdownLabel(date: string | Date) {
  const days = daysUntil(date);
  if (days === 0) return "Hari ini";
  if (days === 1) return "Besok";
  if (days > 1) return `${days} hari lagi`;
  if (days === -1) return "Kemarin";
  return `${Math.abs(days)} hari lalu`;
}

export function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Untuk input datetime-local: ISO -> "yyyy-MM-ddTHH:mm" (WIB) */
export function toLocalInput(date: string | null | undefined) {
  if (!date) return "";
  return format(zoned(date), "yyyy-MM-dd'T'HH:mm");
}

/** "yyyy-MM-ddTHH:mm" dianggap WIB -> ISO UTC */
export function fromLocalInput(value: string) {
  if (!value) return "";
  return new Date(`${value}:00+07:00`).toISOString();
}
