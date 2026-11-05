import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  CalendarDays,
  Download,
  ExternalLink,
  Globe2,
  HandHelping,
  ListChecks,
  Lock,
  MapPin,
  Pencil,
  PlusCircle,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getActiveMembers, getEventDetail } from "@/lib/services/events";
import { listTransactions } from "@/lib/services/finance";
import { BORROWING_STATUS, EVENT_STATUS } from "@/lib/utils/labels";
import { countdownLabel, daysUntil, fmtDate, fmtTime, pct, rupiah, toLocalInput, toNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { EmptyState } from "@/components/ui/states";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { SubNav } from "@/components/dashboard/sub-nav";
import { QuestBoard } from "@/components/events/quest-board";
import { CommitteeManager, EventStatusControl, ScheduleManager } from "@/components/events/event-managers";
import { TxList } from "@/components/finance/tx-list";
import { Gallery } from "@/components/documentation/gallery";
import { DocUploader } from "@/components/documentation/doc-uploader";
import { deleteEventAction } from "@/lib/actions/events";

export const metadata: Metadata = { title: "Detail Event" };

const TABS = ["overview", "finance", "committee", "schedule", "checklist", "inventory", "documentation", "reports"] as const;
type Tab = (typeof TABS)[number];

export default async function EventDetailPage({ params, searchParams }: PageProps<"/dashboard/events/[id]">) {
  const session = await requireSession();
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "overview";
  const detail = await getEventDetail(id);
  if (!detail) notFound();
  const { event, tasks, schedules, committee, finance, borrowings, documents } = detail;
  const role = session.profile.role;
  const supabase = await createClient();
  const { data: canManageData } = await supabase.rpc("can_manage_event", { p_event: id });
  const canManage = Boolean(canManageData);
  const canFinance = can(role, "finance.view") || canManage;
  const members = await getActiveMembers(session.organization.id);
  const status = EVENT_STATUS[event.status];
  const questDone = tasks.filter((t) => t.is_done).length;
  const questPct = pct(questDone, tasks.length);
  const days = daysUntil(event.start_date);
  const base = `/dashboard/events/${id}`;

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "finance", label: "Finance" },
    { key: "committee", label: `Panitia (${committee.length})` },
    { key: "schedule", label: "Jadwal" },
    { key: "checklist", label: `Quest ${questPct}%` },
    { key: "inventory", label: "Inventaris" },
    { key: "documentation", label: `Dokumentasi (${documents.length})` },
    { key: "reports", label: "Laporan" },
  ];

  const txs = tab === "finance" && canFinance ? await listTransactions(session.organization.id, { event: id, page: 1, pageSize: 50 }) : null;
  const catSummary =
    tab === "reports" && can(role, "reports.view")
      ? await supabase.rpc("finance_category_summary", { p_from: "2000-01-01", p_to: "2100-12-31", p_event: id })
      : null;

  return (
    <div className="space-y-5">
      <Link href="/dashboard/events" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Semua event
      </Link>

      {/* Header event */}
      <header className="overflow-hidden rounded-[26px] border border-border bg-surface shadow-soft-sm">
        <div className="relative bg-grass-600 p-5 text-white sm:p-7 dark:bg-grass-100">
          {event.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
          ) : null}
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <Badge tone={status.tone} dot className="bg-white/90">
                  {status.label}
                </Badge>
                <Badge className="bg-forest/60 text-white ring-0">{event.kind === "EVENT" ? "Event" : "Kegiatan"}</Badge>
                <Badge className="bg-forest/60 text-white ring-0">
                  {event.is_public ? <Globe2 className="size-3" aria-hidden /> : <Lock className="size-3" aria-hidden />}
                  {event.is_public ? "Publik" : "Internal"}
                </Badge>
              </div>
              <h1 className="mt-3 font-display text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl dark:text-text">{event.name}</h1>
              <ul className="mt-3 flex flex-col gap-1.5 text-sm text-white/90 sm:flex-row sm:flex-wrap sm:gap-x-5 dark:text-muted">
                <li className="flex items-center gap-1.5">
                  <CalendarDays className="size-4" aria-hidden /> {fmtDate(event.start_date, "EEE, d MMM yyyy")} · {fmtTime(event.start_date)} WIB
                </li>
                {event.location ? (
                  <li className="flex items-center gap-1.5">
                    <MapPin className="size-4" aria-hidden /> {event.location}
                  </li>
                ) : null}
              </ul>
            </div>
            {days >= 0 && !["COMPLETED", "CANCELLED"].includes(event.status) ? (
              <div className="shrink-0 rounded-2xl bg-white/95 px-4 py-3 text-forest shadow-soft">
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase">Hitung mundur</p>
                <p className="font-display text-2xl font-extrabold">{countdownLabel(event.start_date)}</p>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 sm:px-7">
          {canManage ? <EventStatusControl eventId={id} status={event.status} /> : null}
          <div className="ml-auto flex flex-wrap gap-2">
            {event.is_public && event.status !== "DRAFT" ? (
              <Link href={`/kegiatan/${event.slug}`} className={buttonClass("ghost", "sm")} target="_blank">
                <ExternalLink /> Halaman publik
              </Link>
            ) : null}
            {canManage ? (
              <ButtonLink href={`${base}/edit`} variant="secondary" size="sm">
                <Pencil /> Ubah
              </ButtonLink>
            ) : null}
            {can(role, "event.delete") ? (
              <ConfirmAction
                label="Hapus"
                icon={<Trash2 />}
                title="Hapus event?"
                description="Event hanya bisa dihapus bila belum punya transaksi keuangan. Jika sudah ada, ubah status menjadi Dibatalkan agar riwayat tetap utuh."
                confirmLabel="Ya, hapus event"
                action={deleteEventAction.bind(null, id)}
              />
            ) : null}
          </div>
        </div>
      </header>

      <SubNav label="Bagian event" items={tabs.map((t) => ({ href: t.key === "overview" ? base : `${base}?tab=${t.key}`, label: t.label, match: { path: base, query: { tab: t.key === "overview" ? null : t.key } } }))} />

      {tab === "overview" ? (
        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat icon={<ListChecks />} tone="grass" label="Quest" value={`${questPct}%`} sub={`${questDone}/${tasks.length} selesai`} progress={questPct} href={`${base}?tab=checklist`} />
              <Stat
                icon={<Wallet />}
                tone="gold"
                label="Budget"
                value={rupiah(event.budget)}
                sub={finance ? `Terpakai ${rupiah(finance.expense)}` : "—"}
                progress={finance && event.budget > 0 ? pct(finance.expense, event.budget) : undefined}
                href={`${base}?tab=finance`}
              />
              <Stat icon={<Users />} tone="sky" label="Panitia" value={String(committee.length)} sub={`Target ${event.target_participant ?? "-"} peserta`} href={`${base}?tab=committee`} />
            </div>
            <Card>
              <CardHeader title="Tentang event" />
              <CardBody>
                <p className="text-[15px] leading-relaxed whitespace-pre-line text-muted">{event.description || "Belum ada deskripsi."}</p>
                <p className="mt-4 text-xs text-muted">
                  Dibuat oleh {detail.creatorName ?? "pengurus"} · {fmtDate(event.created_at)}
                </p>
              </CardBody>
            </Card>
          </div>
          <div className="space-y-5">
            <Card>
              <CardHeader
                title="Quest berikutnya"
                action={
                  <Link href={`${base}?tab=checklist`} className="text-sm font-semibold text-grass-600 hover:underline">
                    Buka quest
                  </Link>
                }
              />
              <CardBody>
                {tasks.filter((t) => !t.is_done).length === 0 ? (
                  <p className="text-sm text-muted">{tasks.length ? "Semua quest selesai!" : "Belum ada quest."}</p>
                ) : (
                  <ul className="space-y-2">
                    {tasks
                      .filter((t) => !t.is_done)
                      .slice(0, 5)
                      .map((t) => (
                        <li key={t.id} className="flex items-center gap-2 text-sm">
                          <span className="size-4 shrink-0 rounded border-2 border-border-strong" aria-hidden />
                          {t.title}
                        </li>
                      ))}
                  </ul>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Jadwal terdekat" />
              <CardBody>
                {schedules.length === 0 ? (
                  <p className="text-sm text-muted">Rundown belum disusun.</p>
                ) : (
                  <ul className="space-y-2">
                    {schedules.slice(0, 4).map((s) => (
                      <li key={s.id} className="flex gap-3 text-sm">
                        <span className="w-12 shrink-0 font-bold text-grass-600 tabular">{fmtTime(s.start_at)}</span>
                        <span>{s.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "finance" ? (
        !canFinance ? (
          <EmptyState compact illustration="wallet" title="Keuangan event hanya untuk panitia & pengurus." />
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <FinStat label="Budget" value={rupiah(finance?.budget ?? event.budget)} tone="bg-surface" />
              <FinStat label="Pemasukan event" value={rupiah(finance?.income ?? 0)} sub={finance?.transferIn ? `+ alokasi kas ${rupiah(finance.transferIn)}` : undefined} tone="bg-grass-100" />
              <FinStat label="Actual (terpakai)" value={rupiah(finance?.expense ?? 0)} sub={`${Math.round(finance?.usedPct ?? 0)}% dari budget`} tone="bg-danger-bg" />
              <FinStat label="Remaining (sisa budget)" value={rupiah(finance?.remaining ?? event.budget)} sub={`Saldo dana event ${rupiah(finance?.balance ?? 0)}`} tone="bg-gold-100" />
            </div>
            {event.budget > 0 ? (
              <Card>
                <CardBody>
                  <div className="mb-2 flex justify-between text-sm font-semibold">
                    <span>Budget vs actual</span>
                    <span className="tabular">
                      {rupiah(finance?.expense ?? 0)} / {rupiah(event.budget)}
                    </span>
                  </div>
                  <Progress value={pct(finance?.expense ?? 0, event.budget)} tone={(finance?.usedPct ?? 0) >= 80 ? "danger" : "gold"} size="lg" label="Budget terpakai" />
                  {(finance?.usedPct ?? 0) >= 80 ? <p className="mt-2 text-sm font-medium text-danger">Budget sudah mencapai {Math.round(finance?.usedPct ?? 0)}%. Tinjau pengeluaran sebelum belanja lagi.</p> : null}
                </CardBody>
              </Card>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {(can(role, "finance.create") || canManage) && !["COMPLETED", "CANCELLED"].includes(event.status) ? (
                <>
                  <ButtonLink href={`/dashboard/finance/transactions/new?type=INCOME&event=${id}`}>
                    <PlusCircle /> Pemasukan event
                  </ButtonLink>
                  <ButtonLink href={`/dashboard/finance/transactions/new?type=EXPENSE&event=${id}`} variant="secondary">
                    Pengeluaran event
                  </ButtonLink>
                </>
              ) : null}
              {event.status === "COMPLETED" ? <p className="text-sm text-muted">Event selesai — transaksi baru butuh izin Super Admin.</p> : null}
            </div>
            {txs && txs.items.length > 0 ? (
              <TxList items={txs.items} />
            ) : (
              <EmptyState compact illustration="wallet" title="Belum ada transaksi event." description="Transaksi event dicatat di akun dana event sendiri, tidak tercampur dengan kas organisasi." />
            )}
          </div>
        )
      ) : null}

      {tab === "committee" ? (
        <CommitteeManager
          eventId={id}
          committee={committee.map((c) => ({ id: c.id, committee_role: c.committee_role, division: c.division, member: c.member }))}
          members={members}
          canManage={canManage}
        />
      ) : null}

      {tab === "schedule" ? <ScheduleManager eventId={id} schedules={schedules} canManage={canManage} defaultDate={toLocalInput(event.start_date).slice(0, 10)} /> : null}

      {tab === "checklist" ? <QuestBoard eventName={event.name} eventId={id} tasks={tasks} members={members} canManage={canManage} /> : null}

      {tab === "inventory" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">Perlengkapan yang dipinjam untuk event ini.</p>
            {event.status !== "CANCELLED" && event.status !== "COMPLETED" ? (
              <ButtonLink href={`/dashboard/borrowings/new?event=${id}`}>
                <HandHelping /> Pinjam untuk event
              </ButtonLink>
            ) : null}
          </div>
          {borrowings.length === 0 ? (
            <EmptyState compact illustration="box" title="Belum ada perlengkapan dipinjam." description="Ajukan peminjaman tenda, kursi, atau sound untuk event ini." />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {borrowings.map((b) => (
                <li key={b.id}>
                  <Link href={`/dashboard/borrowings/${b.id}`} className="block rounded-card border border-border bg-surface p-4 hover:shadow-soft">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs text-muted">{b.borrowing_code}</p>
                        <p className="font-semibold">{b.purpose}</p>
                      </div>
                      <Badge tone={BORROWING_STATUS[b.status].tone}>{BORROWING_STATUS[b.status].label}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      {fmtDate(b.borrow_date)} – {fmtDate(b.expected_return_date)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {b.items.slice(0, 8).map((it) => (
                        <span key={it.id} className="inline-flex items-center gap-1 rounded-md bg-wood-100 px-1.5 py-0.5 font-mono text-[11px] text-wood-600">
                          <Boxes className="size-3" aria-hidden />
                          {it.unit?.unit_code}
                        </span>
                      ))}
                      {b.items.length > 8 ? <span className="text-xs text-muted">+{b.items.length - 8}</span> : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "documentation" ? (
        <div className="space-y-4">
          {can(role, "documents.upload") || canManage ? (
            <DocUploader events={[{ id, name: event.name }]} defaultEventId={id} label="Unggah foto event" />
          ) : null}
          {documents.length === 0 ? (
            <EmptyState compact illustration="photo" title="Belum ada dokumentasi." description="Unggah foto kegiatan supaya ceritanya tidak hilang." />
          ) : (
            <Gallery
              items={documents.map((d) => ({
                id: d.id,
                url: d.url,
                caption: d.caption,
                width: d.width,
                height: d.height,
                meta: `${d.visibility === "PUBLIC" ? "Publik" : "Internal"}${d.taken_at ? ` · ${fmtDate(d.taken_at)}` : ""}`,
              }))}
            />
          )}
        </div>
      ) : null}

      {tab === "reports" ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FinStat label="Peserta" value={`${event.actual_participant ?? "-"} / ${event.target_participant ?? "-"}`} sub="hadir / target" tone="bg-surface" />
            <FinStat label="Quest selesai" value={`${questDone}/${tasks.length}`} sub={`${questPct}%`} tone="bg-grass-100" />
            <FinStat label="Panitia" value={String(committee.length)} tone="bg-sky-100" />
            <FinStat label="Foto dokumentasi" value={String(documents.length)} tone="bg-gold-100" />
          </div>
          {catSummary?.data && (catSummary.data as unknown[]).length > 0 ? (
            <Card>
              <CardHeader title="Rincian anggaran per kategori" />
              <CardBody>
                <ul className="divide-y divide-border">
                  {(catSummary.data as { category: string; type: string; total: number; count: number }[]).map((c) => (
                    <li key={c.category + c.type} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span>
                        {c.category} <span className="text-xs text-muted">({c.count}×)</span>
                      </span>
                      <span className={cn("font-bold tabular", c.type === "INCOME" ? "text-success" : "text-danger")}>
                        {c.type === "INCOME" ? "+" : "−"}
                        {rupiah(toNumber(c.total))}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}
          {can(role, "reports.view") ? (
            <div className="flex flex-wrap gap-2">
              <a href={`/api/reports/csv?report=kas&event=${id}`} className={buttonClass("secondary", "md")}>
                <Download /> Export transaksi event (CSV)
              </a>
              <Link href={`/dashboard/reports/print?report=kas&event=${id}`} className={buttonClass("ghost", "md")} target="_blank">
                Cetak / simpan PDF
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted">Export laporan tersedia untuk pengurus inti.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  icon,
  tone,
  label,
  value,
  sub,
  progress,
  href,
}: {
  icon: React.ReactNode;
  tone: "grass" | "gold" | "sky";
  label: string;
  value: string;
  sub: string;
  progress?: number;
  href: string;
}) {
  return (
    <Link href={href} className="rounded-card border border-border bg-surface p-4 hover:shadow-soft">
      <div className="flex items-center gap-2">
        <ResourceIcon tone={tone} size="sm">
          {icon}
        </ResourceIcon>
        <p className="text-sm font-bold text-muted">{label}</p>
      </div>
      <p className="mt-3 font-display text-2xl font-extrabold tabular">{value}</p>
      <p className="text-xs text-muted">{sub}</p>
      {typeof progress === "number" ? <Progress value={progress} size="sm" tone={tone === "gold" ? "gold" : "grass"} className="mt-2" label={label} /> : null}
    </Link>
  );
}

function FinStat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: string }) {
  return (
    <div className={cn("rounded-card border border-border p-4", tone)}>
      <p className="text-xs font-bold tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1.5 font-display text-xl font-extrabold tabular">{value}</p>
      {sub ? <p className="text-xs text-muted">{sub}</p> : null}
    </div>
  );
}
