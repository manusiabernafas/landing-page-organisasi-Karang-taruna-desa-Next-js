import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getDuesMonth, getMyDues } from "@/lib/services/dues";
import { fmtDate, pct, rupiah, todayJakarta } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Progress } from "@/components/ui/progress";
import { LinkTabs } from "@/components/ui/tabs";
import { SearchInput } from "@/components/ui/search-input";
import { DUES_STATUS, HouseholdDues } from "@/components/dues/household-dues";
import { GenerateBillsButton, PayButton } from "@/components/dues/dues-actions";

export const metadata: Metadata = { title: "Iuran" };

function shiftMonth(period: string, n: number) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}

export default async function DuesPage({ searchParams }: PageProps<"/dashboard/dues">) {
  const session = await requireSession();
  const role = session.profile.role;

  if (!can(role, "dues.view")) {
    const mine = await getMyDues();
    return mine ? (
      <HouseholdDues detail={mine} />
    ) : (
      <EmptyState illustration="wallet" title="Akun Anda belum terhubung ke tagihan iuran." description="Minta pengurus menghubungkan akun ke data anggota & tagihan rumah Anda." />
    );
  }

  const sp = await searchParams;
  const current = `${todayJakarta().slice(0, 7)}-01`;
  const period = typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m) ? `${sp.m}-01` : current;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const q = typeof sp.q === "string" ? sp.q.toLowerCase() : "";
  const supabase = await createClient();
  const [month, accounts] = await Promise.all([
    getDuesMonth(session.organization.id, period),
    supabase.from("finance_accounts").select("id,name,type").eq("organization_id", session.organization.id).eq("is_active", true).neq("type", "EVENT").order("type"),
  ]);
  const accs = (accounts.data ?? []) as { id: string; name: string; type: string }[];
  const cashId = accs.find((a) => a.type === "CASH")?.id;
  const canPay = can(role, "dues.pay");
  const rows = month.rows
    .filter((r) => !status || (status === "NONE" ? !r.bill : r.bill?.status === status))
    .filter((r) => !q || r.household.name.toLowerCase().includes(q) || r.household.members.some((m) => m.name.toLowerCase().includes(q)));
  const missing = month.rows.length - month.billsCreated;
  const mKey = period.slice(0, 7);
  const tabHref = (s?: string) => `/dashboard/dues?m=${mKey}${s ? `&status=${s}` : ""}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/dues?m=${shiftMonth(period, -1).slice(0, 7)}`} className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface hover:bg-bg-soft" aria-label="Bulan sebelumnya">
            <ChevronLeft className="size-5" />
          </Link>
          <h2 className="min-w-40 text-center font-display text-xl font-bold capitalize">{fmtDate(period, "MMMM yyyy")}</h2>
          <Link href={`/dashboard/dues?m=${shiftMonth(period, 1).slice(0, 7)}`} className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface hover:bg-bg-soft" aria-label="Bulan berikutnya">
            <ChevronRight className="size-5" />
          </Link>
        </div>
        {can(role, "households.manage") && missing > 0 ? <GenerateBillsButton period={period} label={`Buat ${missing} tagihan bulan ini`} /> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-card bg-forest p-5 text-white sm:col-span-2">
          <p className="text-sm text-[#b9cbb8]">Terkumpul bulan ini</p>
          <p className="mt-1 font-display text-3xl font-extrabold tabular">
            {rupiah(month.totals.paid)} <span className="text-base font-semibold text-[#9fb39e]">/ {rupiah(month.totals.due)}</span>
          </p>
          <div className="mt-3 rounded-full bg-white/10 p-1">
            <Progress value={pct(month.totals.paid, month.totals.due)} tone="gold" size="md" className="bg-transparent ring-0" label="Iuran terkumpul" />
          </div>
        </div>
        <div className="rounded-card border border-border bg-surface p-5">
          <p className="text-xs text-muted">Status tagihan</p>
          <p className="mt-1 text-sm">
            <span className="font-bold text-success tabular">{month.totals.paidCount}</span> lunas ·{" "}
            <span className="font-bold text-gold-600 tabular">{month.totals.partialCount}</span> kurang ·{" "}
            <span className="font-bold text-danger tabular">{month.totals.unpaidCount}</span> belum
          </p>
        </div>
        <div className="rounded-card border border-border bg-surface p-5">
          <p className="text-xs text-muted">Tunggakan bulan-bulan sebelumnya</p>
          <p className="mt-1 font-display text-xl font-extrabold tabular">{rupiah(month.totals.arrears)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput placeholder="Cari nama anggota atau tagihan…" className="lg:max-w-sm lg:flex-1" />
        <LinkTabs
          label="Filter status"
          active={status ?? "all"}
          tabs={[
            { key: "all", label: "Semua", href: tabHref() },
            { key: "UNPAID", label: "Belum bayar", href: tabHref("UNPAID") },
            { key: "PARTIAL", label: "Kurang", href: tabHref("PARTIAL") },
            { key: "PAID", label: "Lunas", href: tabHref("PAID") },
            ...(missing ? [{ key: "NONE", label: "Belum ditagih", href: tabHref("NONE") }] : []),
          ]}
        />
      </div>

      {month.rows.length === 0 ? (
        <EmptyState
          illustration="wallet"
          title="Belum ada tagihan iuran."
          description="Buat daftar tagihan dulu: perorangan atau kakak-adik serumah, lengkap dengan nominalnya."
          action={{ label: "Atur daftar tagihan", href: "/dashboard/dues/households" }}
        />
      ) : rows.length === 0 ? (
        <EmptyState compact illustration="wallet" title="Tidak ada tagihan dengan filter ini." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          {rows.map(({ household: h, bill, arrears }) => {
            const st = bill ? DUES_STATUS[bill.status] : null;
            const outstanding = (bill && bill.status !== "WAIVED" ? bill.amount_due - bill.amount_paid : 0) + arrears.amount;
            return (
              <li key={h.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/dashboard/dues/households/${h.id}`} className="font-bold hover:text-grass-600">
                      {h.name}
                    </Link>
                    {h.members.length > 1 ? (
                      <Badge tone="sky">
                        <Users className="size-3" aria-hidden /> {h.members.length} orang
                      </Badge>
                    ) : null}
                    {st ? <Badge tone={st.tone}>{st.label}</Badge> : <Badge tone="gray">Belum ditagih</Badge>}
                  </div>
                  {h.members.length > 1 ? <p className="truncate text-xs text-muted">{h.members.map((m) => m.nickname ?? m.name).join(", ")}</p> : null}
                  <p className="mt-1 text-sm text-muted tabular">
                    {bill ? (
                      <>
                        {rupiah(bill.amount_paid)} / {rupiah(bill.amount_due)}
                      </>
                    ) : (
                      <>Iuran {rupiah(h.monthly_fee)}/bulan</>
                    )}
                    {arrears.amount > 0 ? <span className={cn("ml-2 font-semibold text-danger")}>+ tunggakan {rupiah(arrears.amount)} ({arrears.months} bln)</span> : null}
                  </p>
                </div>
                {canPay && accs.length ? (
                  <PayButton
                    household={{ id: h.id, name: h.name, monthly_fee: h.monthly_fee, members: h.members.map((m) => m.name) }}
                    outstanding={outstanding}
                    accounts={accs}
                    defaultAccountId={cashId}
                    variant={outstanding > 0 ? "primary" : "secondary"}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
