import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, History, ShieldCheck } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fmtDateTime } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/states";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { SearchInput } from "@/components/ui/search-input";
import { FilterSelect } from "@/components/ui/filter-select";
import { Pagination } from "@/components/ui/pagination";
import type { AuditLog } from "@/types/db";

export const metadata: Metadata = { title: "Audit Log" };
const PER_PAGE = 30;

const ENTITY: Record<string, string> = {
  finance_transactions: "Transaksi",
  finance_categories: "Kategori keuangan",
  finance_accounts: "Akun kas",
  events: "Event",
  inventory_items: "Barang",
  inventory_units: "Unit",
  borrowings: "Peminjaman",
  inventory_maintenance: "Maintenance",
  members: "Anggota",
  documents: "Dokumentasi",
  profiles: "Pengguna",
};
const ACTION_TONE = { CREATE: "green", UPDATE: "sky", DELETE: "red", APPROVE: "gold" } as const;

export default async function AuditPage({ searchParams }: PageProps<"/dashboard/settings/audit">) {
  const session = await requirePermission("audit.view");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.replace(/[%,()*]/g, " ").trim() : "";
  const entity = typeof sp.entity === "string" && sp.entity in ENTITY ? sp.entity : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let query = supabase.from("audit_logs").select("id,actor_name,action,entity,entity_id,summary,metadata,created_at", { count: "exact" }).eq("organization_id", session.organization.id);
  if (entity) query = query.eq("entity", entity);
  if (q) query = query.ilike("summary", `%${q}%`);
  const from = (page - 1) * PER_PAGE;
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, from + PER_PAGE - 1);
  const logs = (data ?? []) as AuditLog[];

  return (
    <div className="space-y-5">
      <Link href="/dashboard/settings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Pengaturan
      </Link>
      <PageHeader
        eyebrow="Audit log"
        title="Jejak perubahan basecamp"
        description="Dicatat otomatis oleh database. Tidak ada pengguna yang dapat mengubah atau menghapus audit log."
        icon={
          <ResourceIcon tone="sky" size="lg">
            <History />
          </ResourceIcon>
        }
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_240px]">
        <SearchInput placeholder="Cari di ringkasan, misal TND-004 atau nama…" />
        <FilterSelect param="entity" label="Filter jenis data" options={[{ value: "", label: "Semua data" }, ...Object.entries(ENTITY).map(([v, l]) => ({ value: v, label: l }))]} />
      </div>
      {logs.length === 0 ? (
        <EmptyState illustration="camp" title="Belum ada catatan." />
      ) : (
        <ol className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          {logs.map((l) => {
            const changes = (l.metadata as { changes?: Record<string, { from: unknown; to: unknown }> })?.changes;
            const keys = changes && !("deleted" in changes) ? Object.keys(changes).slice(0, 6) : [];
            return (
              <li key={l.id} className="px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={ACTION_TONE[l.action as keyof typeof ACTION_TONE] ?? "gray"}>{l.action}</Badge>
                  <span className="text-xs font-semibold text-muted">{ENTITY[l.entity] ?? l.entity}</span>
                  <span className="ml-auto text-xs text-subtle tabular">{fmtDateTime(l.created_at)}</span>
                </div>
                <p className="mt-1 text-sm">{l.summary}</p>
                {keys.length ? (
                  <details className="mt-1 text-xs text-muted">
                    <summary className="cursor-pointer select-none">Detail perubahan</summary>
                    <ul className="mt-1 space-y-0.5 font-mono break-all">
                      {keys.map((k) => (
                        <li key={k}>
                          {k}: {JSON.stringify(changes![k].from)} → {JSON.stringify(changes![k].to)}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
      <Pagination
        page={page}
        pageSize={PER_PAGE}
        total={count ?? 0}
        makeHref={(p) => {
          const u = new URLSearchParams();
          if (q) u.set("q", q);
          if (entity) u.set("entity", entity);
          u.set("page", String(p));
          return `/dashboard/settings/audit?${u}`;
        }}
      />
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <ShieldCheck className="size-4 text-grass" aria-hidden /> Audit log hanya bisa dibaca Super Admin, Pengurus, dan Bendahara.
      </p>
    </div>
  );
}
