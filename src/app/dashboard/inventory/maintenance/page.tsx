import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { listMaintenance } from "@/lib/services/inventory";
import { MAINTENANCE_STATUS } from "@/lib/utils/labels";
import { fmtDate, rupiah } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { LinkTabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/states";
import { CompleteMaintenanceButton } from "@/components/inventory/inventory-actions";

export const metadata: Metadata = { title: "Maintenance" };

export default async function MaintenancePage({ searchParams }: PageProps<"/dashboard/inventory/maintenance">) {
  const session = await requireSession();
  const sp = await searchParams;
  const view = sp.view === "done" ? "done" : "active";
  const list = await listMaintenance(session.organization.id, view);
  const canManage = can(session.profile.role, "inventory.manage");
  return (
    <div className="space-y-4">
      <LinkTabs
        label="Status maintenance"
        active={view}
        tabs={[
          { key: "active", label: "Sedang ditangani", href: "/dashboard/inventory/maintenance" },
          { key: "done", label: "Selesai", href: "/dashboard/inventory/maintenance?view=done" },
        ]}
      />
      {list.length === 0 ? (
        <EmptyState
          illustration="box"
          title={view === "active" ? "Tidak ada unit dalam maintenance." : "Belum ada riwayat maintenance."}
          description={view === "active" ? "Semua perlengkapan dalam kondisi siap dipakai." : undefined}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((m) => (
            <li key={m.id} className="rounded-card border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/dashboard/inventory/units/${m.unit?.unit_code}`} className="font-mono font-bold text-grass-600 hover:underline">
                    {m.unit?.unit_code}
                  </Link>
                  <p className="text-sm text-muted">{m.unit?.item?.name}</p>
                </div>
                <Badge tone={MAINTENANCE_STATUS[m.status].tone}>{MAINTENANCE_STATUS[m.status].label}</Badge>
              </div>
              <p className="mt-2 font-semibold">{m.issue}</p>
              <p className="text-xs text-muted">
                Mulai {fmtDate(m.started_at)}
                {m.completed_at ? ` · selesai ${fmtDate(m.completed_at)}` : ""}
                {m.cost ? ` · biaya ${rupiah(m.cost)}` : ""}
              </p>
              {m.notes ? <p className="mt-1 text-sm">{m.notes}</p> : null}
              {view === "active" && canManage && m.unit ? (
                <div className="mt-3">
                  <CompleteMaintenanceButton id={m.id} unitCode={m.unit.unit_code} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
