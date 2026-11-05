import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, ArrowLeft, Boxes, HandHelping, MapPin, Pencil, QrCode } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getItemDetail } from "@/lib/services/inventory";
import { CONDITION, ITEM_STATUS, UNIT_STATUS } from "@/lib/utils/labels";
import { fmtDate, pct, rupiah } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { EmptyState } from "@/components/ui/states";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { AddUnitsButton } from "@/components/inventory/inventory-actions";
import { archiveItemAction } from "@/lib/actions/inventory";

export const metadata: Metadata = { title: "Detail Barang" };

const dot: Record<string, string> = {
  AVAILABLE: "bg-grass",
  BORROWED: "bg-sky",
  MAINTENANCE: "bg-gold",
  DAMAGED: "bg-danger",
  LOST: "bg-subtle",
};

export default async function ItemDetailPage({ params }: PageProps<"/dashboard/inventory/[id]">) {
  const session = await requireSession();
  const { id } = await params;
  const detail = await getItemDetail(id);
  if (!detail) notFound();
  const { item, units } = detail;
  const canManage = can(session.profile.role, "inventory.manage");
  const counts = units.reduce<Record<string, number>>((a, u) => ({ ...a, [u.status]: (a[u.status] ?? 0) + 1 }), {});
  const maxNum = units.reduce((m, u) => Math.max(m, Number(u.unit_code.split("-").pop()) || 0), 0);
  const st = ITEM_STATUS[item.status];

  return (
    <div className="space-y-5">
      <Link href="/dashboard/inventory" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Semua barang
      </Link>
      <section className="grid gap-5 rounded-[26px] border border-border bg-surface p-4 sm:p-6 lg:grid-cols-[220px_1fr]">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-wood-100">
          {item.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photoUrl} alt={item.name} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <ResourceIcon tone="wood" size="lg">
              <Boxes />
            </ResourceIcon>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={st.tone}>{st.label}</Badge>
            <span className="rounded-md bg-bg-soft px-2 py-0.5 font-mono text-xs">{item.asset_code}</span>
            <span className="rounded-md bg-forest px-2 py-0.5 font-mono text-xs font-bold text-white">{item.unit_prefix}-xxx</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-extrabold">{item.name}</h1>
          <p className="text-sm text-muted">{item.category?.name ?? "Tanpa kategori"}</p>
          {item.description ? <p className="mt-3 text-[15px] text-muted">{item.description}</p> : null}
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted">Tersedia</dt>
              <dd className="font-display text-2xl font-extrabold tabular">
                {item.available_quantity}
                <span className="text-sm text-muted">/{item.total_quantity}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Dipinjam</dt>
              <dd className="font-display text-2xl font-extrabold tabular">{counts.BORROWED ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Maintenance</dt>
              <dd className="font-display text-2xl font-extrabold tabular">{(counts.MAINTENANCE ?? 0) + (counts.DAMAGED ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Harga beli</dt>
              <dd className="font-semibold tabular">{item.purchase_price ? rupiah(item.purchase_price) : "-"}</dd>
              {item.purchase_date ? <dd className="text-xs text-muted">{fmtDate(item.purchase_date)}</dd> : null}
            </div>
          </dl>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-bg-soft" role="img" aria-label="Komposisi status unit">
            {(["AVAILABLE", "BORROWED", "MAINTENANCE", "DAMAGED"] as const).map((s) => (
              <span key={s} className={dot[s]} style={{ width: `${pct(counts[s] ?? 0, units.length)}%` }} />
            ))}
          </div>
          {item.location ? (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
              <MapPin className="size-4" aria-hidden /> {item.location}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            {!item.is_archived && item.available_quantity > 0 ? (
              <ButtonLink href={`/dashboard/borrowings/new?item=${item.id}`}>
                <HandHelping /> Pinjam
              </ButtonLink>
            ) : null}
            <ButtonLink href={`/dashboard/inventory/qr?item=${item.id}`} variant="secondary">
              <QrCode /> Cetak QR
            </ButtonLink>
            {canManage && !item.is_archived ? <AddUnitsButton itemId={item.id} prefix={item.unit_prefix} nextNumber={maxNum + 1} /> : null}
            {canManage ? (
              <ButtonLink href={`/dashboard/inventory/${item.id}/edit`} variant="ghost">
                <Pencil /> Ubah
              </ButtonLink>
            ) : null}
            {canManage ? (
              <ConfirmAction
                label={item.is_archived ? "Aktifkan" : "Arsipkan"}
                icon={item.is_archived ? <ArchiveRestore /> : <Archive />}
                variant="ghost"
                size="md"
                confirmVariant={item.is_archived ? "primary" : "danger"}
                title={item.is_archived ? "Aktifkan kembali barang?" : "Arsipkan barang?"}
                description={
                  item.is_archived
                    ? "Barang akan tampil lagi di daftar inventaris."
                    : "Barang yang diarsipkan tidak tampil di daftar dan tidak bisa dipinjam. Riwayat unit tetap tersimpan — data tidak dihapus."
                }
                action={archiveItemAction.bind(null, item.id, !item.is_archived)}
              />
            ) : null}
          </div>
        </div>
      </section>

      <section aria-labelledby="units-title">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 id="units-title" className="font-display text-lg font-bold">
            Unit {item.name} ({units.length})
          </h2>
          <ul className="flex flex-wrap gap-3 text-xs text-muted">
            {(["AVAILABLE", "BORROWED", "MAINTENANCE", "DAMAGED", "LOST"] as const).map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <span className={cn("size-2.5 rounded-full", dot[s])} aria-hidden /> {UNIT_STATUS[s].label}
              </li>
            ))}
          </ul>
        </div>
        {units.length === 0 ? (
          <EmptyState compact illustration="box" title="Belum ada unit." description="Tambahkan unit agar barang bisa dipinjam dan punya QR." />
        ) : (
          <ul className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {units.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/dashboard/inventory/units/${u.unit_code}`}
                  className={cn(
                    "flex flex-col rounded-xl border border-border bg-surface p-2.5 transition hover:-translate-y-0.5 hover:shadow-soft",
                    u.status === "LOST" && "opacity-50",
                  )}
                >
                  <span className="flex items-center justify-between gap-1">
                    <span className="font-mono text-sm font-bold">{u.unit_code}</span>
                    <span className={cn("size-2.5 rounded-full", dot[u.status])} aria-label={UNIT_STATUS[u.status].label} />
                  </span>
                  <span className="mt-1 text-[11px] text-muted">{CONDITION[u.condition].label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
