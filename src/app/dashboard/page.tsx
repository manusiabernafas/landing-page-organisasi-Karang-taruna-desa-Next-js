import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CalendarClock,
  CalendarPlus,
  HandHelping,
  History,
  Info,
  PartyPopper,
  PlusCircle,
  ReceiptText,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getCashflowSeries, getDashboardOverview } from "@/lib/services/dashboard";
import { computeLevel } from "@/lib/utils/level";
import { countdownLabel, daysUntil, fmtDate, fromNow, num, pct, rupiah, rupiahShort } from "@/lib/utils/format";
import { EVENT_STATUS } from "@/lib/utils/labels";
import { cn } from "@/lib/utils/cn";
import { BasecampScene } from "@/components/illustrations/basecamp-scene";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/states";
import { CashflowPanel } from "@/components/dashboard/cashflow-panel";
import { AchievementBadge } from "@/components/dashboard/achievement-badge";

export const metadata: Metadata = { title: "Basecamp" };

export default async function DashboardHome({ searchParams }: PageProps<"/dashboard">) {
  const session = await requireSession();
  const sp = await searchParams;
  const role = session.profile.role;
  const [overview, cashflow] = await Promise.all([getDashboardOverview(session), getCashflowSeries("30d")]);
  const level = computeLevel(overview.metrics);
  const firstName = session.profile.full_name.split(" ")[0];
  const u = overview.units;
  const nearAchievements = overview.achievements
    .filter((a) => !a.unlocked_at)
    .sort((a, b) => b.progress / b.threshold - a.progress / a.threshold)
    .slice(0, 2);
  const attentionCount =
    overview.attention.pendingBorrowings +
    overview.attention.pendingTransactions +
    overview.attention.openMaintenance +
    overview.attention.dueBorrowings.filter((b) => daysUntil(b.expected_return_date) <= 1).length;

  return (
    <div className="space-y-6">
      {sp.denied ? (
        <p role="alert" className="flex items-center gap-2 rounded-2xl border border-warning/40 bg-warning-bg px-4 py-3 text-sm font-medium text-text">
          <AlertCircle className="size-4 shrink-0 text-warning" aria-hidden />
          Halaman tersebut belum bisa diakses dengan peran Anda. Hubungi pengurus inti bila perlu akses.
        </p>
      ) : null}

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-muted">{fmtDate(new Date(), "EEEE, d MMMM yyyy")}</p>
          <h1 className="mt-1 font-display text-[26px] leading-tight font-extrabold tracking-tight sm:text-3xl">
            Selamat datang kembali, {firstName}.
          </h1>
          <p className="mt-1 text-muted">Basecamp RW 05 siap bergerak hari ini.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {can(role, "finance.create") ? (
            <ButtonLink href="/dashboard/finance/transactions/new" size="md" variant="primary">
              <PlusCircle /> Catat Transaksi
            </ButtonLink>
          ) : null}
          {can(role, "event.create") ? (
            <ButtonLink href="/dashboard/events/new" size="md" variant="gold">
              <CalendarPlus /> Buat Event
            </ButtonLink>
          ) : null}
          <ButtonLink href="/dashboard/borrowings/new" size="md" variant="secondary">
            <HandHelping /> Pinjam Barang
          </ButtonLink>
        </div>
      </div>

      {/* Basecamp level */}
      <section aria-labelledby="level-title" className="relative overflow-hidden rounded-[26px] bg-forest text-white shadow-soft">
        <div className="grid items-stretch md:grid-cols-[1.15fr_1fr]">
          <div className="relative z-10 p-5 sm:p-7">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-gold px-2.5 py-1 text-[11px] font-extrabold tracking-[0.14em] text-forest uppercase">{level.title}</span>
              <span className="inline-flex items-center gap-1 text-xs text-[#9fb39e]" title="Level hanya visualisasi perkembangan organisasi, bukan penilaian anggota.">
                <Info className="size-3.5" aria-hidden /> Perkembangan organisasi
              </span>
            </div>
            <h2 id="level-title" className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              BASECAMP LEVEL {level.level}
            </h2>
            <p className="mt-1 text-lg font-semibold text-gold">{level.message}</p>
            <div className="mt-5">
              <div className="mb-2 flex items-end justify-between text-sm">
                <span className="text-[#b9cbb8] tabular">
                  {num(level.xp)} / {num(level.nextAt)} XP
                </span>
                <span className="font-display text-2xl font-extrabold tabular">{level.progress}%</span>
              </div>
              <div className="rounded-full bg-white/10 p-1">
                <Progress value={level.progress} tone="gold" size="lg" segmented className="bg-transparent ring-0" label={`Progress level ${level.level}`} />
              </div>
              <p className="mt-2 text-xs text-[#9fb39e]">{level.toNext > 0 ? `${num(level.toNext)} XP lagi menuju level ${level.level + 1}.` : "Level maksimum tercapai."}</p>
            </div>
            <ul className="mt-5 flex flex-wrap gap-2">
              {level.breakdown.slice(0, 4).map((b) => (
                <li key={b.key} className="rounded-xl bg-white/8 px-3 py-1.5 text-xs ring-1 ring-white/10">
                  <span className="font-bold text-white tabular">{num(b.value)}</span> <span className="text-[#b9cbb8]">{b.label.toLowerCase()}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative hidden min-h-[240px] md:block">
            <div className="absolute inset-3 overflow-hidden rounded-[20px]">
              <BasecampScene className="h-full w-full object-cover [&]:h-full" title="Basecamp Pemuda RW 05" />
            </div>
          </div>
        </div>
      </section>

      {/* Resource cards */}
      <section aria-label="Resource basecamp" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr_1fr]">
        <Link
          href={can(role, "finance.view") ? "/dashboard/finance" : "/transparansi"}
          className="group relative overflow-hidden rounded-card border border-border bg-surface p-5 shadow-soft-sm transition-shadow hover:shadow-soft sm:col-span-2 xl:col-span-1"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ResourceIcon tone="gold">
                <Wallet />
              </ResourceIcon>
              <p className="text-sm font-bold text-muted">Kas Pemuda</p>
            </div>
            <ArrowRight className="size-4 text-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
          </div>
          <p className="mt-4 font-display text-[34px] leading-none font-extrabold tracking-tight tabular">{rupiah(overview.finance.balance)}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <p className="flex items-center gap-1.5 text-muted">
              <ArrowDownLeft className="size-4 text-success" aria-hidden />
              <span className="font-semibold text-text tabular">{rupiahShort(overview.finance.incomeMonth)}</span> bln ini
            </p>
            <p className="flex items-center gap-1.5 text-muted">
              <ArrowUpRight className="size-4 text-danger" aria-hidden />
              <span className="font-semibold text-text tabular">{rupiahShort(overview.finance.expenseMonth)}</span> bln ini
            </p>
          </div>
        </Link>

        <Link href="/dashboard/events?tab=upcoming" className="group rounded-card border border-gold/40 bg-gold-100 p-5 transition-shadow hover:shadow-soft">
          <div className="flex items-center justify-between">
            <ResourceIcon tone="gold" size="sm">
              <PartyPopper />
            </ResourceIcon>
            <span className="text-xs font-bold text-gold-600 uppercase">Quest aktif</span>
          </div>
          <p className="mt-4 font-display text-4xl font-extrabold tabular">{overview.eventsActive}</p>
          <p className="text-sm font-bold">Event Aktif</p>
          <p className="text-xs text-muted">{overview.upcoming[0] ? `Terdekat: ${overview.upcoming[0].name}` : "Belum ada event terjadwal"}</p>
        </Link>

        <Link href="/dashboard/inventory" className="group rounded-card border border-border bg-surface p-5 transition-shadow hover:shadow-soft">
          <div className="flex items-center justify-between">
            <ResourceIcon tone="wood" size="sm">
              <Boxes />
            </ResourceIcon>
            <span className="text-xs font-bold text-muted tabular">{num(u.AVAILABLE)} siap</span>
          </div>
          <p className="mt-4 font-display text-4xl font-extrabold tabular">{num(u.total)}</p>
          <p className="text-sm font-bold">Inventaris</p>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-bg-soft" role="img" aria-label={`${u.AVAILABLE} tersedia, ${u.BORROWED} dipinjam, ${u.MAINTENANCE + u.DAMAGED} maintenance`}>
            <span className="bg-grass" style={{ width: `${pct(u.AVAILABLE, u.total)}%` }} />
            <span className="bg-sky" style={{ width: `${pct(u.BORROWED, u.total)}%` }} />
            <span className="bg-gold" style={{ width: `${pct(u.MAINTENANCE + u.DAMAGED, u.total)}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-muted tabular">
            {u.BORROWED} dipinjam · {u.MAINTENANCE + u.DAMAGED} maintenance
          </p>
        </Link>

        <Link href="/dashboard/members" className="group rounded-card border border-sky/30 bg-sky-100 p-5 transition-shadow hover:shadow-soft">
          <div className="flex items-center justify-between">
            <ResourceIcon tone="sky" size="sm">
              <Users />
            </ResourceIcon>
            <div className="flex -space-x-2">
              {overview.memberPreview.slice(0, 4).map((m) => (
                <Avatar key={m.id} name={m.name} size={26} />
              ))}
            </div>
          </div>
          <p className="mt-4 font-display text-4xl font-extrabold tabular">{overview.membersActive}</p>
          <p className="text-sm font-bold">Anggota Aktif</p>
          <p className="text-xs text-muted">Pemuda RW 05 Kwarasan</p>
        </Link>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        {/* Cashflow */}
        <Card>
          <CardBody>
            <CashflowPanel initial={cashflow} />
          </CardBody>
        </Card>

        {/* Perlu perhatian */}
        <Card>
          <CardHeader
            title="Perlu perhatian"
            description={attentionCount > 0 ? `${attentionCount} hal menunggu tindakan` : "Semua beres. Basecamp tenang."}
            icon={
              <ResourceIcon tone={attentionCount > 0 ? "gold" : "grass"} size="sm">
                <AlertCircle />
              </ResourceIcon>
            }
          />
          <CardBody className="space-y-2">
            <AttentionRow
              href="/dashboard/borrowings?status=REQUESTED"
              icon={<HandHelping />}
              label="Pengajuan peminjaman"
              count={overview.attention.pendingBorrowings}
              hint="menunggu persetujuan"
            />
            {can(role, "finance.approve") ? (
              <AttentionRow
                href="/dashboard/finance/transactions?status=pending"
                icon={<ReceiptText />}
                label="Transaksi belum disetujui"
                count={overview.attention.pendingTransactions}
                hint="cek nota & setujui"
              />
            ) : null}
            <AttentionRow href="/dashboard/inventory/maintenance" icon={<Wrench />} label="Maintenance terbuka" count={overview.attention.openMaintenance} hint="unit perlu diperbaiki" />
            {overview.attention.dueBorrowings.length > 0 ? (
              <div className="pt-2">
                <p className="mb-1.5 text-xs font-bold tracking-wider text-muted uppercase">Barang sedang dipinjam</p>
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {overview.attention.dueBorrowings.map((b) => {
                    const d = daysUntil(b.expected_return_date);
                    return (
                      <li key={b.id}>
                        <Link href={`/dashboard/borrowings/${b.id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-surface-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{b.borrower_name}</p>
                            <p className="text-xs text-muted">{b.borrowing_code}</p>
                          </div>
                          <Badge tone={d < 0 ? "red" : d <= 1 ? "gold" : "gray"}>{d < 0 ? `Telat ${Math.abs(d)} hari` : `Kembali ${countdownLabel(b.expected_return_date).toLowerCase()}`}</Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        {/* Upcoming events */}
        <Card>
          <CardHeader
            title="Event mendatang"
            description="Quest yang sedang disiapkan"
            action={
              <Link href="/dashboard/events" className={buttonClass("ghost", "sm")}>
                Semua <ArrowRight />
              </Link>
            }
          />
          <CardBody>
            {overview.upcoming.length === 0 ? (
              <EmptyState
                compact
                illustration="calendar"
                title="Belum ada event."
                description="Basecamp masih tenang. Yuk buat kegiatan pertama."
                action={can(role, "event.create") ? { label: "Buat Event", href: "/dashboard/events/new" } : undefined}
              />
            ) : (
              <ul className="space-y-3">
                {overview.upcoming.map((e) => {
                  const quest = pct(e.questDone, e.questTotal);
                  const st = EVENT_STATUS[e.status];
                  return (
                    <li key={e.id}>
                      <Link
                        href={`/dashboard/events/${e.id}`}
                        className="group grid gap-3 rounded-2xl border border-border p-4 transition-colors hover:border-grass/40 hover:bg-surface-2 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                      >
                        <div className="flex size-14 flex-col items-center justify-center rounded-2xl bg-grass-100 text-grass-600">
                          <span className="text-[10px] font-bold uppercase">{fmtDate(e.start_date, "MMM")}</span>
                          <span className="font-display text-xl leading-none font-extrabold tabular">{fmtDate(e.start_date, "d")}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-display font-bold group-hover:text-grass-600">{e.name}</p>
                            <Badge tone={st.tone}>{st.label}</Badge>
                          </div>
                          <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock className="size-3.5" aria-hidden /> {countdownLabel(e.start_date)}
                            </span>
                            {e.location ? <span>{e.location}</span> : null}
                          </p>
                          <div className="mt-2.5 flex items-center gap-3">
                            <Progress value={quest} size="sm" tone={quest >= 75 ? "grass" : "gold"} className="flex-1" label={`Progress ${e.name}`} />
                            <span className="w-10 text-right text-xs font-bold tabular">{quest}%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t border-border pt-3 text-right sm:block sm:border-0 sm:pt-0">
                          <p className="text-xs text-muted">Budget</p>
                          <p className="font-display font-extrabold tabular">{rupiahShort(e.budget)}</p>
                          {e.budget > 0 ? (
                            <p className={cn("text-xs font-semibold tabular", e.budgetUsed >= 80 ? "text-danger" : "text-muted")}>{Math.round(e.budgetUsed)}% terpakai</p>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          {/* Activity */}
          <Card>
            <CardHeader
              title="Aktivitas basecamp"
              icon={
                <ResourceIcon tone="sky" size="sm">
                  <History />
                </ResourceIcon>
              }
              action={
                can(role, "audit.view") ? (
                  <Link href="/dashboard/settings/audit" className={buttonClass("ghost", "sm")}>
                    Audit log
                  </Link>
                ) : null
              }
            />
            <CardBody>
              {!can(role, "audit.view") || overview.audit.length === 0 ? (
                <p className="text-sm text-muted">
                  {can(role, "audit.view") ? "Belum ada aktivitas tercatat." : "Riwayat aktivitas hanya terlihat oleh pengurus inti."}
                </p>
              ) : (
                <ol className="space-y-3">
                  {overview.audit.map((a) => (
                    <li key={a.id} className="flex gap-3">
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-grass" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-sm leading-snug text-text">{a.summary}</p>
                        <p className="text-xs text-muted">{fromNow(a.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>

          {/* Achievements */}
          {nearAchievements.length > 0 ? (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-base font-bold">Hampir terbuka</h2>
                <Link href="/dashboard/achievements" className="text-sm font-semibold text-grass-600 hover:underline">
                  Semua achievement
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {nearAchievements.map((a) => (
                  <AchievementBadge key={a.code} {...a} unlockedAt={a.unlocked_at} compact />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AttentionRow({ href, icon, label, count, hint }: { href: string; icon: React.ReactNode; label: string; count: number; hint: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
      <ResourceIcon tone={count > 0 ? "gold" : "soft"} size="sm">
        {icon}
      </ResourceIcon>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted">{count > 0 ? hint : "tidak ada"}</p>
      </div>
      <span className={cn("font-display text-xl font-extrabold tabular", count > 0 ? "text-text" : "text-subtle")}>{count}</span>
    </Link>
  );
}
