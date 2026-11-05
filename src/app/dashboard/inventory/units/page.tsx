import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listUnits } from "@/lib/services/inventory";
import { CONDITION } from "@/lib/utils/labels";
import { SearchInput } from "@/components/ui/search-input";
import { LinkTabs } from "@/components/ui/tabs";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { UnitStatusBadge } from "@/components/inventory/unit-badges";

export const metadata: Metadata = { title: "Unit Barang" };
const PER_PAGE = 30;

export default async function UnitsPage({ searchParams }: PageProps<"/dashboard/inventory/units">) {
  const session = await requireSession();
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const res = await listUnits(session.organization.id, { status, q, page, pageSize: PER_PAGE });
  const href = (s?: string) => {
    const u = new URLSearchParams();
    if (s) u.set("status", s);
    if (q) u.set("q", q);
    return `/dashboard/inventory/units${u.size ? `?${u}` : ""}`;
  };
  return (
    <div className="space-y-4">
      <SearchInput placeholder="Cari kode unit, misal TND-004…" className="max-w-md" />
      <LinkTabs
        label="Status unit"
        active={status ?? "all"}
        tabs={[
          { key: "all", label: "Semua", href: href() },
          { key: "AVAILABLE", label: "Tersedia", href: href("AVAILABLE") },
          { key: "BORROWED", label: "Dipinjam", href: href("BORROWED") },
          { key: "MAINTENANCE", label: "Maintenance", href: href("MAINTENANCE") },
          { key: "DAMAGED", label: "Rusak", href: href("DAMAGED") },
          { key: "LOST", label: "Hilang", href: href("LOST") },
        ]}
      />
      {res.items.length === 0 ? (
        <EmptyState compact illustration="box" title="Tidak ada unit di sini." />
      ) : (
        <>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {res.items.map((u) => (
              <li key={u.id}>
                <Link href={`/dashboard/inventory/units/${u.unit_code}`} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 hover:shadow-soft">
                  <div className="min-w-0">
                    <p className="font-mono font-bold">{u.unit_code}</p>
                    <p className="truncate text-xs text-muted">
                      {u.item?.name} · {CONDITION[u.condition].label}
                    </p>
                  </div>
                  <UnitStatusBadge status={u.status} />
                </Link>
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            pageSize={PER_PAGE}
            total={res.total}
            makeHref={(p) => {
              const u = new URLSearchParams();
              if (status) u.set("status", status);
              if (q) u.set("q", q);
              u.set("page", String(p));
              return `/dashboard/inventory/units?${u}`;
            }}
          />
        </>
      )}
    </div>
  );
}
