import type { Metadata } from "next";
import Link from "next/link";
import { Archive, Boxes, PackagePlus, ScanLine } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getInventoryCategories, listItems } from "@/lib/services/inventory";
import { ITEM_STATUS } from "@/lib/utils/labels";
import { num, pct } from "@/lib/utils/format";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { SearchInput } from "@/components/ui/search-input";
import { FilterSelect } from "@/components/ui/filter-select";
import { Pagination } from "@/components/ui/pagination";
import { ResourceIcon } from "@/components/ui/resource-icon";

export const metadata: Metadata = { title: "Inventaris" };
const PER_PAGE = 16;

export default async function InventoryPage({ searchParams }: PageProps<"/dashboard/inventory">) {
  const session = await requireSession();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const category = typeof sp.category === "string" ? sp.category : undefined;
  const archived = sp.archived === "1";
  const page = Math.max(1, Number(sp.page) || 1);
  const [res, categories] = await Promise.all([
    listItems(session.organization.id, { q, category, archived, page, pageSize: PER_PAGE }),
    getInventoryCategories(session.organization.id),
  ]);
  const canManage = can(session.profile.role, "inventory.manage");
  const totalUnits = res.items.reduce((a, i) => a + i.total_quantity, 0);
  const avail = res.items.reduce((a, i) => a + i.available_quantity, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput placeholder="Cari barang, kode aset, atau prefix…" className="lg:max-w-md lg:flex-1" />
        <FilterSelect
          param="category"
          label="Filter kategori"
          className="lg:w-56"
          options={[{ value: "", label: "Semua kategori" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
        />
        <div className="flex gap-2 lg:ml-auto">
          <ButtonLink href="/dashboard/inventory/scan" variant="secondary" className="flex-1 lg:flex-none">
            <ScanLine /> Scan QR
          </ButtonLink>
          {canManage ? (
            <ButtonLink href="/dashboard/inventory/new" className="flex-1 lg:flex-none">
              <PackagePlus /> Tambah Barang
            </ButtonLink>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted">
          {archived ? "Barang diarsipkan" : `${res.total} jenis barang`} · <span className="font-semibold text-text tabular">{num(avail)}</span> dari{" "}
          <span className="tabular">{num(totalUnits)}</span> unit siap dipinjam (halaman ini)
        </p>
        <Link href={archived ? "/dashboard/inventory" : "/dashboard/inventory?archived=1"} className="inline-flex items-center gap-1.5 font-semibold text-muted hover:text-text">
          <Archive className="size-4" /> {archived ? "Lihat barang aktif" : "Lihat arsip"}
        </Link>
      </div>

      {res.items.length === 0 ? (
        <EmptyState
          illustration="box"
          title={q || category ? "Barang tidak ditemukan." : archived ? "Belum ada barang diarsipkan." : "Belum ada perlengkapan tercatat."}
          description={q || category ? "Coba kata kunci atau kategori lain." : archived ? undefined : "Catat tenda, kursi, sound, dan perlengkapan lain supaya mudah dipinjam dan dirawat."}
          action={canManage && !q && !archived ? { label: "Tambah Barang", href: "/dashboard/inventory/new" } : undefined}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {res.items.map((it) => {
            const ratio = pct(it.available_quantity, it.total_quantity);
            const st = ITEM_STATUS[it.status];
            return (
              <li key={it.id}>
                <Link href={`/dashboard/inventory/${it.id}`} className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface shadow-soft-sm transition hover:-translate-y-0.5 hover:shadow-soft">
                  <div className="relative flex h-28 items-center justify-center bg-wood-100">
                    {it.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.photoUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <ResourceIcon tone="wood" size="lg">
                        <Boxes />
                      </ResourceIcon>
                    )}
                    <span className="absolute top-2 left-2 rounded-md bg-forest/85 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">{it.unit_prefix}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display font-bold group-hover:text-grass-600">{it.name}</p>
                        <p className="truncate text-xs text-muted">{it.category?.name ?? "Tanpa kategori"}</p>
                      </div>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                    <div className="mt-auto pt-4">
                      <div className="flex items-baseline justify-between">
                        <p className="font-display text-2xl font-extrabold tabular">
                          {it.available_quantity}
                          <span className="text-sm font-semibold text-muted">/{it.total_quantity}</span>
                        </p>
                        <p className="text-xs text-muted">{it.unit_label} tersedia</p>
                      </div>
                      <div className="mt-2 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-bg-soft" aria-hidden>
                        <span className="rounded-full bg-grass" style={{ width: `${ratio}%` }} />
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination
        page={page}
        pageSize={PER_PAGE}
        total={res.total}
        makeHref={(p) => {
          const u = new URLSearchParams();
          if (q) u.set("q", q);
          if (category) u.set("category", category);
          if (archived) u.set("archived", "1");
          u.set("page", String(p));
          return `/dashboard/inventory?${u}`;
        }}
      />
    </div>
  );
}
