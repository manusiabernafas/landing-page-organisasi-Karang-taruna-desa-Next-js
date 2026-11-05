import Link from "next/link";
import {
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  CalendarRange,
  Camera,
  Coins,
  HandHeart,
  Leaf,
  Lightbulb,
  MapPin,
  PartyPopper,
  Sparkles,
  Tent,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { BasecampScene } from "@/components/illustrations/basecamp-scene";
import { EmptyCamp } from "@/components/illustrations/empty-camp";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { EmptyState } from "@/components/ui/states";
import { EventCard } from "@/components/events/event-card";
import { CashflowChart } from "@/components/finance/cashflow-chart";
import { AchievementBadge } from "@/components/dashboard/achievement-badge";
import { SectionHeading } from "./section-heading";
import {
  getAchievements,
  getActivityFeed,
  getCashflow,
  getFinanceSummary,
  getInventorySummary,
  getOrganization,
  getPublicDocuments,
  getPublicEvents,
  getPublicStats,
  getPublicTransactions,
} from "@/lib/services/public";
import { createClient } from "@/lib/supabase/server";
import { computeLevel } from "@/lib/utils/level";
import { fmtDate, fromNow, num, pct, rupiah } from "@/lib/utils/format";
import { ORG_LOCATION_FULL } from "@/lib/config";
import { cn } from "@/lib/utils/cn";

function Unavailable({ what }: { what: string }) {
  return (
    <div role="status" className="rounded-card border border-dashed border-border-strong bg-surface-2 px-6 py-10 text-center">
      <EmptyCamp variant="rain" className="mx-auto h-20" />
      <p className="mt-3 font-display font-bold text-text">Data {what} belum berhasil dimuat. Coba lagi.</p>
      <p className="mt-1 text-sm text-muted">Basecamp sedang menyambungkan data. Muat ulang halaman sebentar lagi.</p>
    </div>
  );
}

/* =====================================================================
   HERO
   ===================================================================== */
export async function HeroLevelChip() {
  const stats = await getPublicStats();
  if (!stats.data) return null;
  const lvl = computeLevel(stats.data.metrics);
  return (
    <div className="anim-rise absolute -bottom-5 left-3 w-[min(19rem,calc(100%-1.5rem))] rounded-2xl border border-border bg-surface/95 p-3.5 shadow-soft-lg backdrop-blur sm:left-6">
      <div className="flex items-center gap-3">
        <ResourceIcon tone="forest" size="md">
          <Tent />
        </ResourceIcon>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-[0.16em] text-muted uppercase">Basecamp Level {lvl.level}</p>
          <p className="truncate font-display text-sm font-extrabold text-text">{lvl.message}</p>
        </div>
        <span className="font-display text-lg font-extrabold text-grass-600 tabular">{lvl.progress}%</span>
      </div>
      <Progress value={lvl.progress} tone="grass" size="md" segmented className="mt-2.5" label={`Basecamp level ${lvl.level}`} />
    </div>
  );
}

export function Hero({ levelChip }: { levelChip: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-title">
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pt-10 pb-16 sm:px-6 sm:pt-14 lg:grid-cols-[1fr_1.08fr] lg:gap-12 lg:px-8 lg:pt-20 lg:pb-24">
        <div className="anim-rise">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted shadow-soft-sm">
            <MapPin className="size-3.5 text-grass" aria-hidden />
            Kwarasan • Nogotirto • Gamping • Sleman
          </p>
          <h1 id="hero-title" className="mt-5 font-sans text-[40px] leading-[1.05] font-extrabold tracking-[-0.03em] text-text sm:text-6xl lg:text-[64px]">
            Bangun Kegiatan.
            <br />
            <span className="text-grass-600">Kelola Kas.</span>
            <br />
            Gerakkan <span className="relative inline-block">
              Pemuda.
              <svg viewBox="0 0 220 16" className="absolute -bottom-1.5 left-0 h-3 w-full text-gold" preserveAspectRatio="none" aria-hidden>
                <path d="M3 11 Q60 3 110 8 T217 6" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Basecamp digital Pemuda RW 05 Kwarasan untuk mengelola kegiatan, event, kas, inventaris, dan cerita komunitas dalam satu tempat.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/kegiatan" size="lg" variant="primary" className="w-full sm:w-auto">
              <CalendarRange /> Lihat Kegiatan
            </ButtonLink>
            <ButtonLink href="/login" size="lg" variant="secondary" className="w-full sm:w-auto">
              Masuk Basecamp <ArrowRight />
            </ButtonLink>
          </div>
          <p className="mt-6 text-sm text-muted">Satu basecamp untuk kegiatan, kas, inventaris, dan cerita Pemuda RW 05.</p>
        </div>
        <div className="relative">
          <div className="absolute -inset-3 -z-10 rotate-2 rounded-[34px] bg-gold/25 sm:-inset-4" aria-hidden />
          <div className="overflow-hidden rounded-[28px] border-4 border-surface shadow-soft-lg">
            <BasecampScene />
          </div>
          {levelChip}
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   TENTANG
   ===================================================================== */
const values = [
  { icon: Users, title: "Kebersamaan", text: "Nongkrong yang ada hasilnya. Semua anggota punya tempat dan peran.", tone: "grass" as const },
  { icon: HandHeart, title: "Gotong royong", text: "Kerja bakti, bakti sosial, dan bantu tetangga hajatan — dikerjakan bareng.", tone: "gold" as const },
  { icon: Lightbulb, title: "Kreativitas", text: "Dari pentas seni sampai pelatihan desain untuk UMKM kampung.", tone: "sky" as const },
  { icon: Leaf, title: "Peduli lingkungan", text: "Bank sampah, tanam pohon, dan selokan bersih sebelum musim hujan.", tone: "wood" as const },
];

export async function AboutSection() {
  const org = await getOrganization();
  return (
    <section id="tentang" className="scroll-mt-20 py-16 sm:py-20" aria-labelledby="tentang-title">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8">
        <div>
          <SectionHeading id="tentang-title" eyebrow="Tentang Pemuda RW 05" title="Anak muda Kwarasan yang gantian ngurusin kampung." />
          <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-muted sm:text-base">
            <p>
              {org.data?.about ??
                "Kami anak-anak muda Kwarasan yang tumbuh bareng di gang yang sama, main di lapangan yang sama, dan sekarang gantian jadi yang ngurusin kampung."}
            </p>
            <p>
              Basecamp ini kami bangun supaya semua kegiatan tercatat rapi: siapa pegang apa, uang kas dipakai buat apa, tenda sedang dipinjam siapa, dan
              foto-foto kegiatan tidak hilang di grup WhatsApp. Warga bisa ikut melihat, anggota bisa ikut bergerak.
            </p>
          </div>
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
            <ResourceIcon tone="sky" size="sm">
              <MapPin />
            </ResourceIcon>
            <div className="text-sm">
              <p className="font-bold text-text">Pemuda RW 05 Kwarasan</p>
              <p className="text-muted">{ORG_LOCATION_FULL}</p>
            </div>
          </div>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {values.map((v, i) => (
            <li
              key={v.title}
              className={cn("rounded-card border border-border bg-surface p-5 shadow-soft-sm", i % 2 === 1 && "sm:translate-y-6")}
            >
              <ResourceIcon tone={v.tone}>
                <v.icon />
              </ResourceIcon>
              <h3 className="mt-4 font-display text-lg font-bold text-text">{v.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{v.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* =====================================================================
   BASECAMP STATISTICS
   ===================================================================== */
export async function StatsSection() {
  const stats = await getPublicStats();
  const d = stats.data;
  const m = d?.metrics;
  const doneRatio = d && d.activities_this_year ? pct(Math.min(m?.activities_completed ?? 0, d.activities_this_year), d.activities_this_year) : 0;
  const cards = [
    {
      icon: Users,
      label: "Anggota Aktif",
      value: d?.members_active,
      tone: "grass" as const,
      meta: "Pemuda Kwarasan yang terdaftar & aktif",
    },
    {
      icon: Sparkles,
      label: "Kegiatan Tahun Ini",
      value: d?.activities_this_year,
      tone: "sky" as const,
      meta: `${num(Math.min(m?.activities_completed ?? 0, d?.activities_this_year ?? 0))} sudah terlaksana`,
      progress: doneRatio,
    },
    {
      icon: Boxes,
      label: "Inventaris",
      value: d?.inventory_units,
      tone: "wood" as const,
      meta: `${num(d?.inventory_items ?? 0)} jenis barang, semua ber-QR`,
    },
    {
      icon: Trophy,
      label: "Event Tahun Ini",
      value: d?.events_this_year,
      tone: "gold" as const,
      meta: d?.events_active ? `${num(d.events_active)} sedang disiapkan` : "Event besar pemuda",
      progress: d && d.events_this_year ? pct(d.events_this_year - (d.events_active ?? 0), d.events_this_year) : undefined,
    },
  ];
  const glow = { grass: "bg-grass", sky: "bg-sky", wood: "bg-wood", gold: "bg-gold" } as const;
  return (
    <section className="py-16 sm:py-20" aria-labelledby="stats-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="stats-title"
          eyebrow="Basecamp Statistics"
          title="Sumber daya basecamp hari ini"
          description="Angka dihitung langsung dari data basecamp, bukan diketik manual."
          action={
            d ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted">
                <span className="anim-lamp size-2 rounded-full bg-grass" aria-hidden /> Data langsung dari basecamp
              </span>
            ) : null
          }
        />
        {!d ? (
          <div className="mt-8">
            <Unavailable what="statistik" />
          </div>
        ) : (
          <div className="mt-8 rounded-[28px] bg-forest p-2 shadow-soft-lg ring-1 ring-border sm:p-3">
            <ul className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              {cards.map((c) => (
                <li key={c.label} className="relative isolate flex min-w-0 flex-col overflow-hidden rounded-[20px] bg-white/[0.05] p-3.5 ring-1 ring-white/10 sm:p-5">
                  <span className={cn("absolute inset-x-0 top-0 h-1", glow[c.tone])} aria-hidden />
                  <div className="flex flex-col items-start gap-2 min-[400px]:flex-row min-[400px]:items-center min-[400px]:gap-2.5">
                    <ResourceIcon tone={c.tone} size="sm">
                      <c.icon />
                    </ResourceIcon>
                    <p className="text-[13px] leading-tight font-bold text-white/85 sm:text-sm">{c.label}</p>
                  </div>
                  <p className="mt-3 font-display text-4xl leading-none font-extrabold tracking-tight text-white tabular sm:mt-5 sm:text-6xl">{num(c.value ?? 0)}</p>
                  <div className="mt-auto pt-4">
                    {typeof c.progress === "number" ? (
                      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
                        <div className={cn("anim-bar h-full rounded-full", glow[c.tone])} style={{ width: `${c.progress}%` }} />
                      </div>
                    ) : null}
                    <p className="text-xs leading-snug text-[#b9cbb8]">{c.meta}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/* =====================================================================
   KEGIATAN MENDATANG
   ===================================================================== */
export async function UpcomingSection() {
  const events = await getPublicEvents("upcoming", 3);
  let progress: Record<string, number> = {};
  if (events.data?.length) {
    const supabase = await createClient();
    const results = await Promise.all(events.data.map((e) => supabase.rpc("public_event_progress", { p_event: e.id })));
    progress = Object.fromEntries(
      events.data.map((e, i) => {
        const p = results[i].data as { total: number; done: number } | null;
        return [e.id, p && p.total ? pct(p.done, p.total) : 0];
      }),
    );
  }
  return (
    <section className="py-16 sm:py-20" aria-labelledby="upcoming-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="upcoming-title"
          eyebrow="Kegiatan Mendatang"
          title="Quest berikutnya untuk warga Kwarasan"
          description="Datang, bantu, atau sekadar ramaikan. Semua kegiatan terbuka untuk warga RW 05."
          action={
            <Link href="/kegiatan" className={buttonClass("secondary", "md")}>
              Semua kegiatan <ArrowRight />
            </Link>
          }
        />
        <div className="mt-8">
          {!events.data ? (
            <Unavailable what="kegiatan" />
          ) : events.data.length === 0 ? (
            <EmptyState illustration="calendar" title="Belum ada kegiatan terjadwal." description="Basecamp masih tenang. Pantau terus, kegiatan berikutnya segera diumumkan." />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 [&>li]:min-w-0">
              {events.data.map((e, i) => (
                <li key={e.id}>
                  <EventCard event={e} href={`/kegiatan/${e.slug}`} progress={progress[e.id]} coverUrl={e.coverUrl} index={i} showBudget />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   TRANSPARANSI KAS
   ===================================================================== */
export async function TransparencySection() {
  const [summary, flow, txs] = await Promise.all([getFinanceSummary(), getCashflow(6), getPublicTransactions(5)]);
  return (
    <section id="transparansi" className="scroll-mt-20 py-16 sm:py-20" aria-labelledby="kas-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="kas-title"
          eyebrow="Transparansi Kas"
          title="Kas pemuda, terbuka untuk warga"
          description="Saldo dihitung otomatis dari transaksi yang sudah disetujui bendahara. Rincian yang tampil di sini hanya transaksi yang ditandai publik."
          action={
            <Link href="/transparansi" className={buttonClass("secondary", "md")}>
              Laporan lengkap <ArrowRight />
            </Link>
          }
        />
        {!summary.data ? (
          <div className="mt-8">
            <Unavailable what="kas" />
          </div>
        ) : (
          <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] [&>*]:min-w-0">
            <div className="flex min-w-0 flex-col gap-4">
              <div className="relative overflow-hidden rounded-card bg-forest p-6 text-white shadow-soft">
                <svg viewBox="0 0 200 120" className="absolute -right-6 -bottom-6 h-36 opacity-15" aria-hidden>
                  <circle cx="140" cy="70" r="46" fill="#f2b632" />
                  <circle cx="100" cy="90" r="30" fill="#f2b632" />
                </svg>
                <p className="flex items-center gap-2 text-sm font-semibold text-[#b9cbb8]">
                  <Wallet className="size-4 text-gold" aria-hidden /> Kas Pemuda RW 05
                </p>
                <p className="mt-2 font-display text-[32px] leading-none font-extrabold tracking-tight tabular min-[380px]:text-[40px] sm:text-5xl">{rupiah(summary.data.balance)}</p>
                <p className="mt-2 text-xs text-[#9fb39e]">
                  Saldo per {fmtDate(new Date(), "d MMMM yyyy")}
                  {summary.data.updated_at ? ` · transaksi terakhir disetujui ${fromNow(summary.data.updated_at)}` : ""}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 [&>*]:min-w-0">
                <div className="rounded-card border border-border bg-surface p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                    <ArrowDownLeft className="size-4 text-success" aria-hidden /> Pemasukan bulan ini
                  </p>
                  <p className="mt-1.5 font-display text-xl font-extrabold text-text tabular">{rupiah(summary.data.income_month)}</p>
                </div>
                <div className="rounded-card border border-border bg-surface p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                    <ArrowUpRight className="size-4 text-danger" aria-hidden /> Pengeluaran bulan ini
                  </p>
                  <p className="mt-1.5 font-display text-xl font-extrabold text-text tabular">{rupiah(summary.data.expense_month)}</p>
                </div>
                <div className="flex items-center justify-between rounded-card border border-border bg-surface p-4 min-[400px]:col-span-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-muted">
                    <PartyPopper className="size-4 text-gold-600" aria-hidden /> Event aktif
                  </p>
                  <p className="font-display text-2xl font-extrabold text-text tabular">{summary.data.events_active}</p>
                </div>
              </div>
            </div>
            <div className="rounded-card border border-border bg-surface p-5 shadow-soft-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold">Pemasukan vs Pengeluaran</h3>
                <span className="text-xs text-muted">6 bulan terakhir</span>
              </div>
              <div className="mt-3">
                {flow.data ? (
                  <CashflowChart data={flow.data.map((f) => ({ label: fmtDate(f.month, "MMM"), income: f.income, expense: f.expense }))} height={230} />
                ) : (
                  <Unavailable what="grafik" />
                )}
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-bold tracking-wider text-muted uppercase">Transaksi publik terbaru</p>
                {txs.data && txs.data.length > 0 ? (
                  <ul className="mt-2 divide-y divide-border">
                    {txs.data.map((t) => (
                      <li key={t.transaction_code} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text">{t.description ?? t.category}</p>
                          <p className="text-xs text-muted">
                            {fmtDate(t.transaction_date)} · {t.category}
                            {t.event_name ? ` · ${t.event_name}` : ""}
                          </p>
                        </div>
                        <p className={cn("shrink-0 text-sm font-bold tabular", t.type === "INCOME" ? "text-success" : "text-danger")}>
                          {t.type === "INCOME" ? "+" : "−"}
                          {rupiah(t.amount)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted">Belum ada transaksi yang dipublikasikan.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* =====================================================================
   INVENTARIS
   ===================================================================== */
export async function InventorySection() {
  const items = await getInventorySummary();
  return (
    <section className="py-16 sm:py-20" aria-labelledby="inv-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="inv-title"
          eyebrow="Inventaris"
          title="Gudang perlengkapan basecamp"
          description="Tenda, kursi, sound, sampai sendok — semua bertanda QR. Warga RW 05 bisa meminjam lewat pengurus."
        />
        <div className="mt-8">
          {!items.data ? (
            <Unavailable what="inventaris" />
          ) : items.data.length === 0 ? (
            <EmptyState illustration="box" title="Belum ada perlengkapan tercatat." description="Ringkasan inventaris akan tampil setelah pengurus mencatat barang." />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.data.slice(0, 8).map((it) => {
                const ratio = it.total ? Math.round((it.available / it.total) * 100) : 0;
                return (
                  <li key={it.name} className="rounded-card border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display font-bold text-text">{it.name}</p>
                        <p className="truncate text-xs text-muted">{it.category ?? "Perlengkapan"}</p>
                      </div>
                      <ResourceIcon tone="wood" size="sm">
                        <Boxes />
                      </ResourceIcon>
                    </div>
                    <p className="mt-3 text-sm text-muted">
                      <span className="font-display text-2xl font-extrabold text-text tabular">{it.available}</span>
                      <span className="tabular">/{it.total}</span> tersedia
                    </p>
                    <Progress value={ratio} tone={ratio >= 60 ? "grass" : ratio >= 25 ? "gold" : "danger"} size="sm" className="mt-2" label={`Ketersediaan ${it.name}`} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   DOKUMENTASI
   ===================================================================== */
export async function DocumentationSection() {
  const docs = await getPublicDocuments(6);
  return (
    <section className="py-16 sm:py-20" aria-labelledby="doc-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="doc-title"
          eyebrow="Dokumentasi"
          title="Cerita dari lapangan"
          action={
            <Link href="/dokumentasi" className={buttonClass("secondary", "md")}>
              <Camera /> Buka galeri
            </Link>
          }
        />
        <div className="mt-8">
          {!docs.data ? (
            <Unavailable what="dokumentasi" />
          ) : docs.data.items.length === 0 ? (
            <EmptyState illustration="photo" title="Belum ada foto yang dipublikasikan." description="Foto kegiatan akan tampil di sini setelah dipilih pengurus untuk publik." />
          ) : (
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {docs.data.items.map((d, i) => (
                <li key={d.id} className={cn("group relative overflow-hidden rounded-card bg-bg-soft", i === 0 && "col-span-2 row-span-2 md:col-span-1")}>
                  <Link href="/dokumentasi" className="block">
                    {d.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.url} alt={d.caption ?? "Dokumentasi kegiatan Pemuda RW 05"} loading="lazy" className="aspect-[4/3] h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="aspect-[4/3]" />
                    )}
                    <div className="absolute inset-x-2 bottom-2 rounded-xl bg-forest/90 px-3 py-2">
                      <p className="line-clamp-1 text-sm font-semibold text-white">{d.caption ?? d.event_name ?? "Kegiatan pemuda"}</p>
                      {d.event_name ? <p className="line-clamp-1 text-xs text-white/75">{d.event_name}</p> : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   AKTIVITAS & ACHIEVEMENT
   ===================================================================== */
const feedIcon = { event: CalendarRange, document: Camera, finance: Coins } as const;
const feedTone = { event: "grass", document: "sky", finance: "gold" } as const;

export async function ActivitySection() {
  const [feed, achievements] = await Promise.all([getActivityFeed(6), getAchievements()]);
  return (
    <section className="py-16 sm:py-20" aria-labelledby="act-title">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.35fr] lg:px-8">
        <div>
          <SectionHeading id="act-title" eyebrow="Aktivitas Pemuda" title="Yang barusan terjadi di basecamp" />
          <div className="mt-8">
            {!feed.data ? (
              <Unavailable what="aktivitas" />
            ) : feed.data.length === 0 ? (
              <EmptyState compact illustration="camp" title="Basecamp masih tenang." description="Aktivitas publik akan muncul di sini." />
            ) : (
              <ol className="relative space-y-1 border-l-2 border-dashed border-border-strong pl-6">
                {feed.data.map((f, i) => {
                  const Icon = feedIcon[f.kind] ?? Sparkles;
                  return (
                    <li key={i} className="relative">
                      <span className="absolute top-3 -left-[39px]">
                        <ResourceIcon tone={feedTone[f.kind] ?? "grass"} size="sm">
                          <Icon />
                        </ResourceIcon>
                      </span>
                      <Link href={f.link} className="block rounded-xl px-3 py-2.5 hover:bg-surface">
                        <p className="text-sm font-semibold text-text">{f.title}</p>
                        <p className="text-xs text-muted">{fromNow(f.happened_at)}</p>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
        <div>
          <SectionHeading eyebrow="Achievement Organisasi" title="Pencapaian bersama, bukan ranking orang" />
          <div className="mt-8">
            {!achievements.data ? (
              <Unavailable what="achievement" />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {achievements.data.slice(0, 6).map((a) => (
                  <li key={a.id}>
                    <AchievementBadge
                      name={a.name}
                      description={a.description}
                      icon={a.icon}
                      tier={a.tier}
                      progress={a.progress}
                      threshold={a.threshold}
                      unlockedAt={a.unlocked_at}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   CTA
   ===================================================================== */
export function CtaSection() {
  return (
    <section className="px-4 py-10 sm:px-6 lg:px-8" aria-labelledby="cta-title">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-grass px-6 py-12 text-white sm:px-12 sm:py-14 dark:bg-grass-100">
        <svg viewBox="0 0 400 200" className="absolute right-0 bottom-0 h-full opacity-20" preserveAspectRatio="xMaxYMax meet" aria-hidden>
          <path d="M180 200 L290 60 L400 200 Z" fill="#fff" />
          <rect x="288" y="20" width="4" height="42" fill="#fff" />
          <path d="M292 22 L320 30 L292 38 Z" fill="#fff" />
          <path d="M0 200 Q100 150 200 180 T400 170 V200 Z" fill="#fff" />
        </svg>
        <div className="relative max-w-2xl">
          <h2 id="cta-title" className="font-display text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl dark:text-text">
            Punya ide kegiatan atau mau ikut gabung?
          </h2>
          <p className="mt-3 text-base text-white/85 dark:text-muted">
            Mampir ke sekretariat Pemuda RW 05 atau hubungi pengurus RT masing-masing. Pengurus dan anggota bisa langsung masuk ke basecamp.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/login" variant="gold" size="lg">
              Masuk Basecamp <ArrowRight />
            </ButtonLink>
            <ButtonLink href="/kegiatan" size="lg" className="bg-white/15 text-white shadow-none hover:bg-white/25 dark:text-text">
              Lihat Kegiatan
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SectionSkeleton({ tall }: { tall?: boolean }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" role="status" aria-label="Memuat">
      <div className="skeleton h-4 w-40 rounded-lg" />
      <div className="skeleton mt-3 h-9 w-80 max-w-full rounded-lg" />
      <div className={cn("mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4")}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn("skeleton rounded-card", tall ? "h-64" : "h-36")} />
        ))}
      </div>
    </div>
  );
}
