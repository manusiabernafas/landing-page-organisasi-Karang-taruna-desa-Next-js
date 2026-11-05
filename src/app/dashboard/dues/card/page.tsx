import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getDuesYear } from "@/lib/services/dues";
import { CardCell } from "@/components/dues/card-cell";
import { todayJakarta } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { PrintButton } from "@/components/inventory/qr-sheet";

export const metadata: Metadata = { title: "Kartu Iuran" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const LEGEND: Record<string, string> = {
  PAID: "bg-grass text-white dark:text-forest",
  PARTIAL: "bg-gold text-forest",
  UNPAID: "bg-danger-bg text-danger ring-1 ring-inset ring-danger/30",
  WAIVED: "bg-bg-soft text-muted",
};
const SYMBOL: Record<string, string> = { PAID: "✓", PARTIAL: "½", UNPAID: "✗", WAIVED: "–" };

export default async function DuesCardPage({ searchParams }: PageProps<"/dashboard/dues/card">) {
  const session = await requirePermission("dues.view");
  const sp = await searchParams;
  const thisYear = Number(todayJakarta().slice(0, 4));
  const year = Number(sp.year) >= 2000 && Number(sp.year) <= 2100 ? Number(sp.year) : thisYear;
  const supabase = await createClient();
  const [rows, accData] = await Promise.all([
    getDuesYear(session.organization.id, year),
    supabase.from("finance_accounts").select("id,name,type").eq("organization_id", session.organization.id).eq("is_active", true).neq("type", "EVENT").order("type"),
  ]);
  const accounts = (accData.data ?? []) as { id: string; name: string; type: string }[];
  const canPay = can(session.profile.role, "dues.pay") && accounts.length > 0;
  const cashId = accounts.find((a) => a.type === "CASH")?.id;
  const colTotals = MONTHS.map((_, i) => rows.reduce((a, r) => a + (r.months.get(i + 1)?.amount_paid ?? 0), 0));

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/dues/card?year=${year - 1}`} className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface hover:bg-bg-soft" aria-label="Tahun sebelumnya">
            <ChevronLeft className="size-5" />
          </Link>
          <h2 className="font-display text-xl font-bold tabular">Kartu iuran {year}</h2>
          <Link href={`/dashboard/dues/card?year=${year + 1}`} className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface hover:bg-bg-soft" aria-label="Tahun berikutnya">
            <ChevronRight className="size-5" />
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          {(["PAID", "PARTIAL", "UNPAID", "WAIVED"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={cn("inline-flex size-5 items-center justify-center rounded text-[11px] font-bold", LEGEND[s])}>{SYMBOL[s]}</span>
              {{ PAID: "Lunas", PARTIAL: "Kurang", UNPAID: "Belum", WAIVED: "Dibebaskan" }[s]}
            </span>
          ))}
          <PrintButton label="Cetak" />
        </div>
      </div>
      <p className="hidden text-center font-display text-lg font-bold print:block">Kartu Iuran Pemuda RW 05 Kwarasan · {year}</p>
      <div className="overflow-x-auto rounded-card border border-border bg-surface print:overflow-visible">
        <table className="w-full min-w-[820px] border-collapse text-sm print:min-w-0 print:text-[9px]">
          <thead>
            <tr className="bg-bg-soft text-xs font-bold text-muted">
              <th scope="col" className="sticky left-0 z-10 w-28 bg-bg-soft px-2 py-2.5 text-left sm:w-auto sm:px-3">Tagihan</th>
              <th scope="col" className="px-2 py-2.5 text-right">/bulan</th>
              {MONTHS.map((m) => (
                <th key={m} scope="col" className="px-1 py-2.5 text-center">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(({ household: h, months }) => (
              <tr key={h.id} className={cn(!h.is_active && "opacity-60")}>
                <th scope="row" className="sticky left-0 z-10 w-28 max-w-28 bg-surface px-2 py-2 text-left text-xs font-semibold shadow-[1px_0_0_var(--border)] sm:w-auto sm:max-w-52 sm:px-3 sm:text-sm">
                  <Link href={`/dashboard/dues/households/${h.id}`} className="line-clamp-2 hover:text-grass-600 sm:line-clamp-1">
                    {h.name}
                  </Link>
                </th>
                <td className="px-2 py-2 text-right text-xs text-muted tabular">{(h.monthly_fee / 1000).toLocaleString("id-ID")}rb</td>
                {MONTHS.map((_, i) => {
                  const b = months.get(i + 1);
                  const period = `${year}-${String(i + 1).padStart(2, "0")}-01`;
                  return (
                    <td key={i} className="px-0.5 py-1 text-center">
                      {h.is_active || b ? (
                        <CardCell
                          household={{ id: h.id, name: h.name, monthly_fee: h.monthly_fee }}
                          period={period}
                          monthLabel={`${MONTHS[i]} ${year}`}
                          bill={b ? { id: b.id, status: b.status, amount_due: b.amount_due, amount_paid: b.amount_paid } : null}
                          accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
                          defaultAccountId={cashId}
                          canPay={canPay && h.is_active}
                        />
                      ) : (
                        <span className="text-subtle">·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-bg-soft text-xs font-bold">
              <th scope="row" className="sticky left-0 w-28 bg-bg-soft px-2 py-2.5 text-left sm:w-auto sm:px-3">
                Terkumpul
              </th>
              <td />
              {colTotals.map((t, i) => (
                <td key={i} className="px-1 py-2.5 text-center tabular">
                  {t ? `${Math.round(t / 1000)}rb` : "-"}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="no-print flex items-center gap-1.5 text-xs text-muted">
        <Printer className="size-3.5" aria-hidden /> {canPay ? "Pencet kotak untuk menandai lunas bulan itu. " : ""}Geser tabel ke samping di HP; kolom nama tetap terlihat.
      </p>
    </div>
  );
}
