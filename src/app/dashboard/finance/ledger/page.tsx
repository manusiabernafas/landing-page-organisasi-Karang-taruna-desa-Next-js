import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fmtDate, rupiah, toNumber, todayJakarta } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { PrintButton } from "@/components/inventory/qr-sheet";

export const metadata: Metadata = { title: "Buku Kas" };

interface Row {
  transaction_id: string;
  transaction_date: string;
  transaction_code: string;
  description: string;
  category: string | null;
  debit: number;
  credit: number;
  balance: number;
  opening: number;
}

export default async function LedgerPage({ searchParams }: PageProps<"/dashboard/finance/ledger">) {
  const session = await requirePermission("finance.view");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: accData } = await supabase
    .from("finance_accounts")
    .select("id,name,type,event_id")
    .eq("organization_id", session.organization.id)
    .order("type")
    .order("name");
  const accounts = (accData ?? []) as { id: string; name: string; type: string; event_id: string | null }[];
  const today = todayJakarta();
  const accountId = typeof sp.account === "string" && accounts.some((a) => a.id === sp.account) ? sp.account : accounts.find((a) => a.type === "CASH")?.id;
  const date = (v: unknown, d: string) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : d);
  const from = date(sp.from, `${today.slice(0, 7)}-01`);
  const to = date(sp.to, today);
  const { data } = accountId ? await supabase.rpc("account_ledger", { p_account: accountId, p_from: from, p_to: to }) : { data: [] };
  const rows = ((data ?? []) as Row[]).map((r) => ({ ...r, debit: toNumber(r.debit), credit: toNumber(r.credit), balance: toNumber(r.balance), opening: toNumber(r.opening) }));
  const account = accounts.find((a) => a.id === accountId);
  let opening = rows[0]?.opening ?? 0;
  if (!rows.length && accountId) {
    // Tidak ada mutasi di periode ini: saldo awal = saldo akhir sebelum tanggal "dari".
    const [y, m, d] = from.split("-").map(Number);
    const dayBefore = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
    const { data: prev } = await supabase.rpc("account_ledger", { p_account: accountId, p_from: "1900-01-01", p_to: dayBefore });
    const list = (prev ?? []) as Row[];
    opening = list.length ? toNumber(list[list.length - 1].balance) : 0;
  }
  const debit = rows.reduce((a, r) => a + r.debit, 0);
  const credit = rows.reduce((a, r) => a + r.credit, 0);
  const closing = opening + debit - credit;

  return (
    <div className="space-y-4">
      <form method="get" className="no-print grid gap-3 rounded-card border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end">
        <label>
          <span className="mb-1.5 block text-sm font-semibold">Akun</span>
          <Select name="account" defaultValue={accountId}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.type === "EVENT" ? `Dana event · ${a.name.replace(/^Dana /, "").replace(/ #\w+$/, "")}` : a.name}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-semibold">Dari</span>
          <Input type="date" name="from" defaultValue={from} />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-semibold">Sampai</span>
          <Input type="date" name="to" defaultValue={to} />
        </label>
        <div className="flex gap-2">
          <Button type="submit">Tampilkan</Button>
          <PrintButton label="Cetak" />
        </div>
      </form>

      <div className="hidden print:block">
        <p className="font-display text-lg font-bold">Buku Kas Pemuda RW 05 Kwarasan — {account?.name}</p>
        <p className="text-sm">
          Periode {fmtDate(from)} s/d {fmtDate(to)}
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Saldo awal", opening],
          ["Uang masuk", debit],
          ["Uang keluar", credit],
          ["Saldo akhir", closing],
        ].map(([k, v]) => (
          <div key={k as string} className={cn("rounded-card border border-border p-4", k === "Saldo akhir" ? "bg-forest text-white" : "bg-surface")}>
            <dt className={cn("text-xs", k === "Saldo akhir" ? "text-[#b9cbb8]" : "text-muted")}>{k}</dt>
            <dd className="font-display text-xl font-extrabold tabular">{rupiah(v as number)}</dd>
          </div>
        ))}
      </dl>

      {rows.length === 0 ? (
        <EmptyState compact illustration="wallet" title="Tidak ada mutasi pada periode ini." description="Ubah rentang tanggal atau pilih akun lain." />
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface print:overflow-visible">
          <table className="w-full min-w-[720px] text-sm print:min-w-0 print:text-[10px]">
            <thead className="bg-bg-soft text-left text-xs font-bold tracking-wider text-muted uppercase">
              <tr>
                <th scope="col" className="px-3 py-2.5">Tanggal</th>
                <th scope="col" className="px-3 py-2.5">Keterangan</th>
                <th scope="col" className="px-3 py-2.5 text-right">Masuk</th>
                <th scope="col" className="px-3 py-2.5 text-right">Keluar</th>
                <th scope="col" className="px-3 py-2.5 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="bg-surface-2 text-muted">
                <td className="px-3 py-2 tabular">{fmtDate(from)}</td>
                <td className="px-3 py-2 italic">Saldo awal</td>
                <td />
                <td />
                <td className="px-3 py-2 text-right font-semibold tabular">{rupiah(opening)}</td>
              </tr>
              {rows.map((r) => (
                <tr key={r.transaction_id} className="hover:bg-surface-2">
                  <td className="px-3 py-2 whitespace-nowrap tabular">{fmtDate(r.transaction_date)}</td>
                  <td className="px-3 py-2">
                    <Link href={`/dashboard/finance/transactions/${r.transaction_id}`} className="hover:text-grass-600">
                      {r.description}
                    </Link>
                    <span className="block text-xs text-muted">
                      <span className="font-mono">{r.transaction_code}</span>
                      {r.category ? ` · ${r.category}` : ""}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-success tabular">{r.debit ? rupiah(r.debit) : ""}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-danger tabular">{r.credit ? rupiah(r.credit) : ""}</td>
                  <td className="px-3 py-2 text-right font-semibold whitespace-nowrap tabular">{rupiah(r.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-bg-soft font-bold">
              <tr>
                <td className="px-3 py-2.5" colSpan={2}>
                  Jumlah
                </td>
                <td className="px-3 py-2.5 text-right tabular">{rupiah(debit)}</td>
                <td className="px-3 py-2.5 text-right tabular">{rupiah(credit)}</td>
                <td className="px-3 py-2.5 text-right tabular">{rupiah(closing)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
