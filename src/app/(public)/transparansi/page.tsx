import type { Metadata } from "next";
import { ArrowDownLeft, ArrowUpRight, PartyPopper, ShieldCheck, Wallet } from "lucide-react";
import { SectionHeading } from "@/components/landing/section-heading";
import { PublicUnavailable } from "@/components/landing/public-unavailable";
import { CashflowChart } from "@/components/finance/cashflow-chart";
import { LinkTabs } from "@/components/ui/tabs";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { getCashflow, getFinanceSummary, getPublicTransactions } from "@/lib/services/public";
import { fmtDate, rupiah } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = {
  title: "Transparansi Kas",
  description: "Laporan kas terbuka Pemuda RW 05 Kwarasan: saldo, pemasukan, pengeluaran, dan transaksi publik.",
  alternates: { canonical: "/transparansi" },
};

export default async function TransparansiPage({ searchParams }: PageProps<"/transparansi">) {
  const sp = await searchParams;
  const months = sp.range === "12" ? 12 : 6;
  const [summary, flow, txs] = await Promise.all([getFinanceSummary(), getCashflow(months), getPublicTransactions(50)]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <SectionHeading
        eyebrow="Transparansi Kas"
        title="Kas Pemuda RW 05, terbuka untuk warga"
        description="Saldo dihitung otomatis dari seluruh transaksi yang sudah disetujui bendahara — tidak bisa diketik manual. Daftar rincian di bawah hanya memuat transaksi yang ditandai publik oleh pengurus."
      />
      {!summary.data ? (
        <div className="mt-8">
          <PublicUnavailable what="kas" />
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-card bg-forest p-5 text-white sm:col-span-2 lg:col-span-1">
              <p className="flex items-center gap-2 text-sm text-[#b9cbb8]">
                <Wallet className="size-4 text-gold" aria-hidden /> Saldo kas
              </p>
              <p className="mt-2 font-display text-3xl font-extrabold tabular">{rupiah(summary.data.balance)}</p>
            </div>
            <Stat icon={<ArrowDownLeft />} tone="grass" label="Pemasukan bulan ini" value={rupiah(summary.data.income_month)} />
            <Stat icon={<ArrowUpRight />} tone="wood" label="Pengeluaran bulan ini" value={rupiah(summary.data.expense_month)} />
            <Stat icon={<PartyPopper />} tone="gold" label="Event aktif" value={String(summary.data.events_active)} />
          </div>

          <section className="mt-6 rounded-card border border-border bg-surface p-5 shadow-soft-sm" aria-labelledby="grafik">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 id="grafik" className="font-display text-lg font-bold">
                Pemasukan vs Pengeluaran
              </h2>
              <LinkTabs
                label="Rentang grafik"
                active={String(months)}
                tabs={[
                  { key: "6", label: "6 bulan", href: "/transparansi" },
                  { key: "12", label: "12 bulan", href: "/transparansi?range=12" },
                ]}
              />
            </div>
            <div className="mt-4">
              {flow.data ? (
                <CashflowChart data={flow.data.map((f) => ({ label: fmtDate(f.month, "MMM yy"), income: f.income, expense: f.expense }))} height={280} />
              ) : (
                <PublicUnavailable what="grafik" />
              )}
            </div>
          </section>

          <section className="mt-6" aria-labelledby="rincian">
            <div className="flex items-center justify-between gap-3">
              <h2 id="rincian" className="font-display text-lg font-bold">
                Rincian transaksi publik
              </h2>
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <ShieldCheck className="size-4 text-grass" aria-hidden /> Data pribadi & transaksi internal tidak ditampilkan
              </p>
            </div>
            {!txs.data || txs.data.length === 0 ? (
              <p className="mt-3 rounded-card border border-dashed border-border-strong bg-surface-2 p-6 text-center text-sm text-muted">
                Belum ada transaksi yang dipublikasikan.
              </p>
            ) : (
              <>
                <ul className="mt-4 space-y-2 md:hidden">
                  {txs.data.map((t) => (
                    <li key={t.transaction_code} className="rounded-2xl border border-border bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-text">{t.description ?? t.category}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {fmtDate(t.transaction_date)} · {t.category}
                          </p>
                          {t.event_name ? <p className="text-xs text-muted">{t.event_name}</p> : null}
                        </div>
                        <p className={cn("shrink-0 font-bold tabular", t.type === "INCOME" ? "text-success" : "text-danger")}>
                          {t.type === "INCOME" ? "+" : "−"}
                          {rupiah(t.amount)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 hidden overflow-hidden rounded-card border border-border bg-surface md:block">
                  <table className="w-full text-sm">
                    <thead className="bg-bg-soft text-left text-xs font-bold tracking-wider text-muted uppercase">
                      <tr>
                        <th scope="col" className="px-4 py-3">Tanggal</th>
                        <th scope="col" className="px-4 py-3">Keterangan</th>
                        <th scope="col" className="px-4 py-3">Kategori</th>
                        <th scope="col" className="px-4 py-3">Event</th>
                        <th scope="col" className="px-4 py-3 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {txs.data.map((t) => (
                        <tr key={t.transaction_code} className="hover:bg-surface-2">
                          <td className="px-4 py-3 whitespace-nowrap text-muted tabular">{fmtDate(t.transaction_date)}</td>
                          <td className="px-4 py-3 font-medium text-text">{t.description ?? "-"}</td>
                          <td className="px-4 py-3 text-muted">{t.category}</td>
                          <td className="px-4 py-3 text-muted">{t.event_name ?? "Kas organisasi"}</td>
                          <td className={cn("px-4 py-3 text-right font-bold whitespace-nowrap tabular", t.type === "INCOME" ? "text-success" : "text-danger")}>
                            {t.type === "INCOME" ? "+" : "−"}
                            {rupiah(t.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "grass" | "wood" | "gold" }) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-surface p-5">
      <ResourceIcon tone={tone}>{icon}</ResourceIcon>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted">{label}</p>
        <p className="truncate font-display text-xl font-extrabold tabular">{value}</p>
      </div>
    </div>
  );
}
