import type { Metadata } from "next";
import { PlusCircle } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { listTransactions } from "@/lib/services/finance";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "@/lib/config";
import { ButtonLink } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { LinkTabs } from "@/components/ui/tabs";
import { TxList } from "@/components/finance/tx-list";
import { FilterSelect } from "@/components/ui/filter-select";

export const metadata: Metadata = { title: "Transaksi" };

export default async function TransactionsPage({ searchParams }: PageProps<"/dashboard/finance/transactions">) {
  const session = await requirePermission("finance.view");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const page = Math.max(1, Number(str("page")) || 1);
  const type = str("type");
  const status = str("status");
  const q = str("q");
  const account = str("account");
  const supabase = await createClient();
  const [res, accounts] = await Promise.all([
    listTransactions(session.organization.id, { type, status, q, account, page, pageSize: PAGE_SIZE }),
    supabase.from("finance_accounts").select("id,name,type").eq("organization_id", session.organization.id).order("type").order("name"),
  ]);
  const base = new URLSearchParams();
  if (type) base.set("type", type);
  if (q) base.set("q", q);
  if (account) base.set("account", account);
  const statusHref = (s?: string) => {
    const p = new URLSearchParams(base);
    if (s) p.set("status", s);
    const qs = p.toString();
    return `/dashboard/finance/transactions${qs ? `?${qs}` : ""}`;
  };
  const pageHref = (n: number) => {
    const p = new URLSearchParams(base);
    if (status) p.set("status", status);
    p.set("page", String(n));
    return `/dashboard/finance/transactions?${p}`;
  };
  const title = type === "INCOME" ? "Pemasukan" : type === "EXPENSE" ? "Pengeluaran" : type === "TRANSFER" ? "Transfer" : "Semua transaksi";

  return (
    <div className="space-y-4">
      {sp.deleted ? (
        <p role="status" className="rounded-xl bg-bg-soft px-4 py-3 text-sm">
          Transaksi sudah dihapus.
        </p>
      ) : null}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        {can(session.profile.role, "finance.create") ? (
          <ButtonLink href={`/dashboard/finance/transactions/new${type ? `?type=${type}` : ""}`} className="w-full sm:w-auto">
            <PlusCircle /> Catat {type === "INCOME" ? "pemasukan" : type === "EXPENSE" ? "pengeluaran" : "transaksi"}
          </ButtonLink>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_240px]">
        <SearchInput placeholder="Cari keterangan atau kode transaksi…" />
        <FilterSelect
          param="account"
          label="Filter akun"
          options={[{ value: "", label: "Semua akun" }, ...((accounts.data ?? []) as { id: string; name: string }[]).map((a) => ({ value: a.id, label: a.name }))]}
        />
      </div>
      <LinkTabs
        label="Status transaksi"
        active={status ?? "all"}
        tabs={[
          { key: "all", label: "Semua", href: statusHref() },
          { key: "pending", label: "Menunggu persetujuan", href: statusHref("pending") },
          { key: "approved", label: "Disetujui", href: statusHref("approved") },
        ]}
      />
      {res.items.length === 0 ? (
        <EmptyState
          illustration="wallet"
          title={q ? "Transaksi tidak ditemukan." : "Belum ada transaksi di sini."}
          description={q ? "Coba kata kunci lain atau hapus filter." : "Transaksi yang dicatat akan muncul di daftar ini."}
          action={can(session.profile.role, "finance.create") && !q ? { label: "Catat Transaksi", href: "/dashboard/finance/transactions/new" } : undefined}
        />
      ) : (
        <>
          <TxList items={res.items} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={res.total} makeHref={pageHref} />
        </>
      )}
    </div>
  );
}
