import type { Metadata } from "next";
import Link from "next/link";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { TZDate } from "@date-fns/tz";
import { ChevronLeft, ChevronRight, PartyPopper } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listEventsInRange } from "@/lib/services/events";
import { EVENT_STATUS } from "@/lib/utils/labels";
import { fmtDate, fmtTime, TZ } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { PageHeader, EmptyState } from "@/components/ui/states";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { SubNav } from "@/components/dashboard/sub-nav";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Kalender Event" };

const toneBg: Record<string, string> = {
  green: "bg-grass-100 text-grass-600 border-grass/30",
  sky: "bg-sky-100 text-sky-600 border-sky/30",
  gold: "bg-gold-100 text-gold-600 border-gold/40",
  wood: "bg-wood-100 text-wood-600 border-wood/30",
  red: "bg-danger-bg text-danger border-danger/30 line-through",
  gray: "bg-bg-soft text-muted border-border",
};

export default async function CalendarPage({ searchParams }: PageProps<"/dashboard/events/calendar">) {
  const session = await requireSession();
  const sp = await searchParams;
  const now = new TZDate(new Date(), TZ);
  const [y, m] = typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const month = new Date(y, m - 1, 1);
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const events = await listEventsInRange(
    session.organization.id,
    new Date(`${format(gridStart, "yyyy-MM-dd")}T00:00:00+07:00`).toISOString(),
    new Date(`${format(gridEnd, "yyyy-MM-dd")}T23:59:59+07:00`).toISOString(),
  );
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const dayKey = (d: Date) => format(d, "yyyy-MM-dd");
  const byDay = new Map<string, typeof events>();
  for (const e of events) {
    const s = new TZDate(new Date(e.start_date), TZ);
    const en = new TZDate(new Date(e.end_date), TZ);
    for (const d of eachDayOfInterval({ start: new Date(s.getFullYear(), s.getMonth(), s.getDate()), end: new Date(en.getFullYear(), en.getMonth(), en.getDate()) })) {
      const k = dayKey(d);
      byDay.set(k, [...(byDay.get(k) ?? []), e]);
    }
  }
  const todayKey = format(new Date(now.getFullYear(), now.getMonth(), now.getDate()), "yyyy-MM-dd");
  const prev = format(addMonths(month, -1), "yyyy-MM");
  const next = format(addMonths(month, 1), "yyyy-MM");
  const monthEvents = events.filter((e) => {
    const s = new TZDate(new Date(e.start_date), TZ);
    return s.getMonth() === month.getMonth() && s.getFullYear() === month.getFullYear();
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Event & Kegiatan"
        title="Kalender basecamp"
        icon={
          <ResourceIcon tone="grass" size="lg">
            <PartyPopper />
          </ResourceIcon>
        }
      />
      <SubNav
        label="Filter event"
        items={[
          { href: "/dashboard/events", label: "Semua Event", match: { path: "/dashboard/events", query: { tab: null } } },
          { href: "/dashboard/events?tab=upcoming", label: "Mendatang", match: { path: "/dashboard/events", query: { tab: "upcoming" } } },
          { href: "/dashboard/events?tab=ongoing", label: "Berlangsung", match: { path: "/dashboard/events", query: { tab: "ongoing" } } },
          { href: "/dashboard/events?tab=completed", label: "Selesai", match: { path: "/dashboard/events", query: { tab: "completed" } } },
          { href: "/dashboard/events/calendar", label: "Calendar" },
        ]}
      />
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold capitalize">{format(month, "MMMM yyyy", { locale: localeId })}</h2>
        <div className="flex gap-1.5">
          <Link href={`/dashboard/events/calendar?m=${prev}`} className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface hover:bg-bg-soft" aria-label="Bulan sebelumnya">
            <ChevronLeft className="size-5" />
          </Link>
          <Link href="/dashboard/events/calendar" className="inline-flex h-10 items-center rounded-xl border border-border bg-surface px-3 text-sm font-semibold hover:bg-bg-soft">
            Hari ini
          </Link>
          <Link href={`/dashboard/events/calendar?m=${next}`} className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface hover:bg-bg-soft" aria-label="Bulan berikutnya">
            <ChevronRight className="size-5" />
          </Link>
        </div>
      </div>

      {/* Grid kalender (tablet ke atas) */}
      <div className="hidden overflow-hidden rounded-card border border-border bg-surface md:block">
        <div className="grid grid-cols-7 border-b border-border bg-bg-soft text-center text-xs font-bold tracking-wider text-muted uppercase">
          {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
            <div key={d} className="py-2.5">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const k = dayKey(d);
            const list = byDay.get(k) ?? [];
            return (
              <div key={k} className={cn("min-h-28 border-r border-b border-border p-1.5 [&:nth-child(7n)]:border-r-0", !isSameMonth(d, month) && "bg-surface-2 opacity-60")}>
                <p className={cn("mb-1 inline-flex size-7 items-center justify-center rounded-full text-sm font-bold tabular", k === todayKey && "bg-grass text-white dark:text-forest")}>
                  {format(d, "d")}
                </p>
                <ul className="space-y-1">
                  {list.slice(0, 3).map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/dashboard/events/${e.id}`}
                        className={cn("block truncate rounded-md border px-1.5 py-0.5 text-[11px] font-semibold hover:brightness-95", toneBg[EVENT_STATUS[e.status].tone])}
                        title={e.name}
                      >
                        {e.name}
                      </Link>
                    </li>
                  ))}
                  {list.length > 3 ? <li className="px-1 text-[11px] text-muted">+{list.length - 3} lagi</li> : null}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda (mobile) */}
      <div className="md:hidden">
        {monthEvents.length === 0 ? (
          <EmptyState compact illustration="calendar" title="Tidak ada event bulan ini." description="Geser ke bulan lain atau buat event baru." />
        ) : (
          <ol className="space-y-2">
            {monthEvents.map((e) => (
              <li key={e.id}>
                <Link href={`/dashboard/events/${e.id}`} className="flex gap-3 rounded-2xl border border-border bg-surface p-3">
                  <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-grass-100 text-grass-600">
                    <span className="text-[10px] font-bold uppercase">{fmtDate(e.start_date, "EEE")}</span>
                    <span className="font-display text-lg leading-none font-extrabold">{fmtDate(e.start_date, "d")}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">{e.name}</p>
                    <p className="text-xs text-muted">
                      {fmtTime(e.start_date)} WIB{e.location ? ` · ${e.location}` : ""}
                    </p>
                    <Badge tone={EVENT_STATUS[e.status].tone} className="mt-1">
                      {EVENT_STATUS[e.status].label}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
