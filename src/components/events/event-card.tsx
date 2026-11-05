import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EVENT_STATUS } from "@/lib/utils/labels";
import { countdownLabel, daysUntil, fmtDate, fmtTime, rupiahShort } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { EventRow } from "@/types/db";

const accents = ["bg-grass-600", "bg-sky-600", "bg-gold-600", "bg-wood"];

export function EventCard({
  event,
  href,
  progress,
  coverUrl,
  showBudget,
  index = 0,
}: {
  event: Pick<EventRow, "id" | "name" | "slug" | "kind" | "status" | "start_date" | "end_date" | "location" | "budget" | "target_participant">;
  href: string;
  progress?: number | null;
  coverUrl?: string | null;
  showBudget?: boolean;
  index?: number;
}) {
  const status = EVENT_STATUS[event.status];
  const days = daysUntil(event.start_date);
  const upcoming = days >= 0 && event.status !== "COMPLETED" && event.status !== "CANCELLED";
  const start = new Date(event.start_date);
  return (
    <Link
      href={href}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-card border border-border bg-surface shadow-soft-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-soft"
    >
      <div className={cn("relative flex h-28 items-end p-4 text-white dark:text-forest", accents[index % accents.length])}>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <svg viewBox="0 0 200 80" className="absolute inset-0 h-full w-full opacity-25" preserveAspectRatio="xMidYMax slice" aria-hidden>
            <path d="M0 80 L0 58 Q40 40 80 56 T160 50 T200 54 V80 Z" fill="#fff" />
            <path d="M120 80 L146 44 L172 80 Z" fill="#fff" />
            <rect x="145" y="30" width="2" height="16" fill="#fff" />
            <path d="M147 30 L158 34 L147 38 Z" fill="#fff" />
          </svg>
        )}
        <div className="relative flex w-full items-end justify-between gap-2">
          <div className="rounded-xl bg-white/95 px-2.5 py-1.5 text-center text-forest shadow-soft-sm">
            <p className="text-[10px] leading-none font-bold uppercase">{fmtDate(start, "MMM")}</p>
            <p className="font-display text-xl leading-none font-extrabold tabular">{fmtDate(start, "d")}</p>
          </div>
          {upcoming ? (
            <span className="rounded-full bg-forest/80 px-2.5 py-1 text-xs font-bold backdrop-blur-sm">{countdownLabel(event.start_date)}</span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
          <Badge tone="gray">{event.kind === "EVENT" ? "Event" : "Kegiatan"}</Badge>
        </div>
        <h3 className="mt-2.5 font-display text-lg leading-snug font-bold break-words text-text group-hover:text-grass-600">{event.name}</h3>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          <li className="flex min-w-0 items-start gap-2">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />
            <span className="min-w-0">
              {fmtDate(event.start_date, "EEEE, d MMM yyyy")} · {fmtTime(event.start_date)} WIB
            </span>
          </li>
          {event.location ? (
            <li className="flex min-w-0 items-center gap-2">
              <MapPin className="size-4 shrink-0 text-subtle" aria-hidden />
              <span className="min-w-0 truncate">{event.location}</span>
            </li>
          ) : null}
          {event.target_participant ? (
            <li className="flex items-center gap-2">
              <Users className="size-4 shrink-0 text-subtle" aria-hidden />
              Target {event.target_participant} peserta
            </li>
          ) : null}
        </ul>
        <div className="mt-auto pt-4">
          {typeof progress === "number" ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                <span className="text-muted">Progress quest</span>
                <span className="text-text tabular">{progress}%</span>
              </div>
              <Progress value={progress} tone={progress >= 75 ? "grass" : progress >= 40 ? "gold" : "sky"} size="sm" label={`Progress ${event.name}`} />
            </div>
          ) : null}
          {showBudget && Number(event.budget) > 0 ? (
            <p className="mt-3 text-xs text-muted">
              Budget <span className="font-semibold text-text tabular">{rupiahShort(event.budget)}</span>
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
