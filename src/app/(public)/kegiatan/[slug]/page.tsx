import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, ListChecks, MapPin, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { PublicUnavailable } from "@/components/landing/public-unavailable";
import { getPublicEventBySlug } from "@/lib/services/public";
import { EVENT_STATUS } from "@/lib/utils/labels";
import { countdownLabel, daysUntil, fmtDate, fmtTime, pct, rupiah } from "@/lib/utils/format";

export async function generateMetadata({ params }: PageProps<"/kegiatan/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const res = await getPublicEventBySlug(slug);
  const e = res.data?.event;
  if (!e) return { title: "Kegiatan" };
  return {
    title: e.name,
    description: e.description?.slice(0, 160) ?? `${e.name} — kegiatan Pemuda RW 05 Kwarasan.`,
    alternates: { canonical: `/kegiatan/${e.slug}` },
    openGraph: { title: e.name, description: e.description?.slice(0, 160) ?? undefined, images: e.coverUrl ? [e.coverUrl] : undefined },
  };
}

export default async function PublicEventPage({ params }: PageProps<"/kegiatan/[slug]">) {
  const { slug } = await params;
  const res = await getPublicEventBySlug(slug);
  if (res.error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-14">
        <PublicUnavailable what="kegiatan" />
      </div>
    );
  }
  if (!res.data) notFound();
  const { event, schedules, finance, progress, documents } = res.data;
  const status = EVENT_STATUS[event.status];
  const questPct = pct(progress.done, progress.total);
  const upcoming = daysUntil(event.start_date) >= 0 && !["COMPLETED", "CANCELLED"].includes(event.status);

  return (
    <article className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Link href="/kegiatan" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Semua kegiatan
      </Link>
      <header className="mt-5 overflow-hidden rounded-[26px] border border-border bg-surface shadow-soft-sm">
        <div className="relative bg-grass-600 px-5 py-8 text-white sm:px-8 sm:py-10 dark:bg-grass-100">
          {event.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
          ) : null}
          <div className="relative">
            <div className="flex flex-wrap gap-2">
              <Badge tone={status.tone} dot className="bg-white/90">
                {status.label}
              </Badge>
              {upcoming ? <Badge className="bg-forest/70 text-white ring-0">{countdownLabel(event.start_date)}</Badge> : null}
            </div>
            <h1 className="mt-4 font-display text-3xl leading-tight font-extrabold tracking-tight sm:text-5xl dark:text-text">{event.name}</h1>
            <ul className="mt-5 flex flex-col gap-2 text-sm text-white/90 sm:flex-row sm:flex-wrap sm:gap-x-6 dark:text-muted">
              <li className="flex items-center gap-2">
                <CalendarDays className="size-4" aria-hidden /> {fmtDate(event.start_date, "EEEE, d MMMM yyyy")}
              </li>
              <li className="flex items-center gap-2">
                <Clock className="size-4" aria-hidden /> {fmtTime(event.start_date)}–{fmtTime(event.end_date)} WIB
              </li>
              {event.location ? (
                <li className="flex items-center gap-2">
                  <MapPin className="size-4" aria-hidden /> {event.location}
                </li>
              ) : null}
            </ul>
          </div>
        </div>
        {event.description ? <p className="px-5 py-6 text-[15px] leading-relaxed text-muted sm:px-8 sm:text-base">{event.description}</p> : null}
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-card border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <ResourceIcon tone="grass" size="sm">
              <ListChecks />
            </ResourceIcon>
            <p className="text-sm font-bold">Progress persiapan</p>
          </div>
          <p className="mt-3 font-display text-3xl font-extrabold tabular">{questPct}%</p>
          <p className="text-xs text-muted tabular">
            {progress.done} dari {progress.total} quest selesai
          </p>
          <Progress value={questPct} className="mt-3" label="Progress persiapan" />
        </div>
        <div className="rounded-card border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <ResourceIcon tone="gold" size="sm">
              <Wallet />
            </ResourceIcon>
            <p className="text-sm font-bold">Anggaran</p>
          </div>
          {finance ? (
            <>
              <p className="mt-3 font-display text-3xl font-extrabold tabular">{rupiah(finance.budget)}</p>
              <p className="text-xs text-muted">
                Terpakai <span className="font-semibold text-text tabular">{rupiah(finance.expense)}</span> · sisa{" "}
                <span className="font-semibold text-text tabular">{rupiah(finance.remaining)}</span>
              </p>
              <Progress value={finance.usedPct} tone={finance.usedPct >= 80 ? "danger" : "gold"} className="mt-3" label="Penggunaan anggaran" />
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">Anggaran belum dipublikasikan.</p>
          )}
        </div>
        <div className="rounded-card border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <ResourceIcon tone="sky" size="sm">
              <Users />
            </ResourceIcon>
            <p className="text-sm font-bold">Peserta</p>
          </div>
          <p className="mt-3 font-display text-3xl font-extrabold tabular">
            {event.actual_participant ?? event.target_participant ?? "-"}
          </p>
          <p className="text-xs text-muted">{event.actual_participant ? "peserta hadir" : "target peserta"}</p>
        </div>
      </div>

      <section className="mt-8" aria-labelledby="jadwal">
        <h2 id="jadwal" className="font-display text-xl font-bold">
          Jadwal acara
        </h2>
        {schedules.length === 0 ? (
          <p className="mt-3 rounded-card border border-dashed border-border-strong bg-surface-2 px-5 py-6 text-sm text-muted">
            Rundown acara akan diumumkan panitia.
          </p>
        ) : (
          <ol className="mt-4 space-y-2">
            {schedules.map((s) => (
              <li key={s.id} className="flex gap-4 rounded-2xl border border-border bg-surface p-4">
                <div className="w-20 shrink-0 text-sm font-bold text-grass-600 tabular">
                  {fmtTime(s.start_at)}
                  {s.end_at ? <span className="block text-xs font-medium text-muted">s/d {fmtTime(s.end_at)}</span> : null}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-text">{s.title}</p>
                  <p className="text-sm text-muted">
                    {fmtDate(s.start_at, "EEEE, d MMM")}
                    {s.location ? ` · ${s.location}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {documents.length > 0 ? (
        <section className="mt-10" aria-labelledby="dok">
          <h2 id="dok" className="font-display text-xl font-bold">
            Dokumentasi
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {documents.map((d) => (
              <li key={d.id} className="overflow-hidden rounded-2xl bg-bg-soft">
                {d.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.url} alt={d.caption ?? event.name} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                ) : null}
                {d.caption ? <p className="px-3 py-2 text-xs text-muted">{d.caption}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
