import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Banknote, Building2, Clock, Landmark, PartyPopper, PlusCircle, Smartphone } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getAccountsWithBalance, listTransactions } from "@/lib/services/finance";
import { getCashflowSeries } from "@/lib/services/dashboard";
import { fmtDate, pct, rupiah, toNumber, todayJakarta } from "@/lib/utils/format";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { EmptyState } from "@/components/ui/states";
import { CashflowPanel } from "@/components/dashboard/cashflow-panel";
import { TxList } from "@/components/finance/tx-list";
import { CategoryDonut } from "@/components/finance/category-donut";

export const metadata: Metadata = { title: "Keuangan" };

const accIcon = { CASH: Banknote, BANK: Landmark, EWALLET: Smartphone, EVENT: PartyPopper } as const;

export default async function FinanceOverview() {
  const session = await requirePermission("finance.view");
  const orgId = session.organization.id;
  const supabase = await createClient();
  const today = todayJakarta();
  const monthStart = `${today.slice(0, 8)}01`;
  const [accounts, cashflow, recent, pending, catSummary] = await Promise.all([
    getAccountsWithBalance(orgId),
    getCashflowSeries("3m"),
    listTransactions(orgId, { page: 1, pageSize: 6 }),
    listTransactions(orgId, { status: "pending", page: 1, pageSize: 5 }),
    supabase.rpc("finance_category_summary", { p_from: monthStart, p_to: today }),
  ]);
  const kas = accounts.filter((a) => a.type !== "EVENT");
  const events = accounts.filter((a) => a.type === "EVENT");
  const eventIds = events.map((e) => e.event_id!).filter(Boolean);
  const { data: evRows } = eventIds.length
    ? await supabase.from("event_finance_summary").select("event_id,name,budget,income,expense,balance,budget_used_pct").in("event_id", eventIds)
    : { data: [] };
  const { data: evStatus } = eventIds.length ? await supabase.from("events").select("id,status,start_date").in("id", eventIds) : { data: [] };
  const statusMap = new Map(((evStatus ?? []) as { id: string; status: string; start_date: string }[]).map((e) => [e.id, e]));
  const eventFin = ((evRows ?? []) as { event_id: string; name: string; budget: number; income: number; expense: number; balance: number; budget_used_pct: number }[])
    .map((e) => ({ ...e, budget: toNumber(e.budget), income: toNumber(e.income), expense: toNumber(e.expense), balance: toNumber(e.balance), used: toNumber(e.budget_used_pct), status: statusMap.get(e.event_id)?.status, start: statusMap.get(e.event_id)?.start_date }))
    .filter((e) => e.status !== "DRAFT" && (e.income > 0 || e.expense > 0 || e.budget > 0))
    .sort((a, b) => (b.start ?? "").localeCompare(a.start ?? ""));
  const totalKas = kas.reduce((a, k) => a + k.balance, 0);
  const cats = ((catSummary.data ?? []) as { category: string; type: string; color: string | null; total: number }[]).map((c) => ({ ...c, total: toNumber(c.total) }));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_2fr]">
        <div className="rounded-card bg-forest p-5 text-white shadow-soft sm:p-6">
          <p className="text-sm font-semibold text-[#b9cbb8]">Total kas organisasi</p>
          <p className="mt-2 font-display text-4xl font-extrabold tracking-tight tabular">{rupiah(totalKas)}</p>
          <p className="mt-1 text-xs text-[#9fb39e]">Per {fmtDate(today, "d MMMM yyyy")} · tidak termasuk dana event</p>
          {can(session.profile.role, "finance.create") ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <ButtonLink href="/dashboard/finance/transactions/new?type=INCOME" variant="gold" size="sm">
                <PlusCircle /> Pemasukan
              </ButtonLink>
              <ButtonLink href="/dashboard/finance/transactions/new?type=EXPENSE" size="sm" className="bg-white/12 text-white shadow-none hover:bg-white/20">
                Pengeluaran
              </ButtonLink>
              <ButtonLink href="/dashboard/finance/transactions/new?type=TRANSFER" size="sm" className="bg-white/12 text-white shadow-none hover:bg-white/20">
                Transfer
              </ButtonLink>
            </div>
          ) : null}
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {kas.map((a) => {
            const Icon = accIcon[a.type as keyof typeof accIcon] ?? Building2;
            return (
              <li key={a.account_id}>
                <Link href={`/dashboard/finance/transactions?account=${a.account_id}`} className="flex h-full flex-col rounded-card border border-border bg-surface p-5 hover:shadow-soft">
                  <div className="flex items-center gap-3">
                    <ResourceIcon tone={a.type === "BANK" ? "sky" : "grass"} size="sm">
                      <Icon />
                    </ResourceIcon>
                    <p className="font-bold">{a.name}</p>
                    {!a.is_active ? <span className="text-xs text-muted">(nonaktif)</span> : null}
                  </div>
                  <p className="mt-3 font-display text-2xl font-extrabold tabular">{rupiah(a.balance)}</p>
                  <p className="mt-auto pt-2 text-xs text-muted tabular">
                    Masuk {rupiah(a.total_income + a.transfer_in)} · Keluar {rupiah(a.total_expense + a.transfer_out)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
        <Card>
          <CardBody>
            <CashflowPanel initial={cashflow} initialRange="3m" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Komposisi bulan ini" description={fmtDate(today, "MMMM yyyy")} />
          <CardBody>
            {cats.length === 0 ? (
              <p className="text-sm text-muted">Belum ada transaksi disetujui bulan ini.</p>
            ) : (
              <CategoryDonut data={cats} />
            )}
          </CardBody>
        </Card>
      </div>

      {pending.items.length > 0 ? (
        <Card className="border-gold/50">
          <CardHeader
            title={`${pending.total} transaksi menunggu persetujuan`}
            description="Transaksi belum memengaruhi saldo sampai disetujui bendahara."
            icon={
              <ResourceIcon tone="gold" size="sm">
                <Clock />
              </ResourceIcon>
            }
            action={
              <Link href="/dashboard/finance/transactions?status=pending" className={buttonClass("ghost", "sm")}>
                Lihat <ArrowRight />
              </Link>
            }
          />
          <CardBody>
            <TxList items={pending.items} />
          </CardBody>
        </Card>
      ) : null}

      <section aria-labelledby="event-accounts">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 id="event-accounts" className="font-display text-lg font-bold">
              Dana per event
            </h2>
            <p className="text-sm text-muted">Setiap event punya akun sendiri — transaksi tidak tercampur.</p>
          </div>
        </div>
        {eventFin.length === 0 ? (
          <EmptyState compact illustration="wallet" title="Belum ada dana event." description="Akun dana otomatis dibuat saat event baru ditambahkan." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {eventFin.slice(0, 9).map((e) => (
              <li key={e.event_id}>
                <Link href={`/dashboard/events/${e.event_id}?tab=finance`} className="block rounded-card border border-border bg-surface p-4 hover:shadow-soft">
                  <p className="line-clamp-1 font-bold">{e.name}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted">Budget</p>
                      <p className="font-bold tabular">{rupiah(e.budget)}</p>
                    </div>
                    <div>
                      <p className="text-muted">Terpakai</p>
                      <p className="font-bold tabular">{rupiah(e.expense)}</p>
                    </div>
                    <div>
                      <p className="text-muted">Saldo</p>
                      <p className="font-bold tabular">{rupiah(e.balance)}</p>
                    </div>
                  </div>
                  {e.budget > 0 ? (
                    <Progress value={pct(e.expense, e.budget)} size="sm" tone={e.used >= 80 ? "danger" : "gold"} className="mt-3" label={`Budget ${e.name}`} />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card>
        <CardHeader
          title="Transaksi terbaru"
          action={
            <Link href="/dashboard/finance/transactions" className={buttonClass("ghost", "sm")}>
              Semua <ArrowRight />
            </Link>
          }
        />
        <CardBody>
          {recent.items.length === 0 ? (
            <EmptyState
              compact
              illustration="wallet"
              title="Belum ada transaksi."
              description="Catat pemasukan pertama, misalnya iuran anggota bulan ini."
              action={can(session.profile.role, "finance.create") ? { label: "Catat Transaksi", href: "/dashboard/finance/transactions/new" } : undefined}
            />
          ) : (
            <TxList items={recent.items} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
