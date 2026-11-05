import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getHouseholdsForManage } from "@/lib/services/dues";
import { rupiah } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { CreateSinglesButton } from "@/components/dues/dues-actions";

export const metadata: Metadata = { title: "Daftar Tagihan" };

export default async function HouseholdsPage() {
  const session = await requirePermission("dues.view");
  const { houses, members } = await getHouseholdsForManage(session.organization.id);
  const lonely = members.filter((m) => m.status === "ACTIVE" && !m.household_id).length;
  const canManage = can(session.profile.role, "households.manage");
  const active = houses.filter((h) => h.is_active);
  const total = active.reduce((a, h) => a + h.monthly_fee, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {active.length} tagihan aktif · {active.filter((h) => h.members.length > 1).length} rumah kakak-adik · potensi iuran{" "}
          <span className="font-semibold text-text tabular">{rupiah(total)}</span>/bulan
        </p>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <CreateSinglesButton count={lonely} />
            <ButtonLink href="/dashboard/dues/households/new">
              <Plus /> Tagihan baru
            </ButtonLink>
          </div>
        ) : null}
      </div>
      {houses.length === 0 ? (
        <EmptyState illustration="people" title="Belum ada daftar tagihan." description="Buat tagihan perorangan otomatis, lalu gabungkan kakak-adik yang serumah." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {houses.map((h) => (
            <li key={h.id}>
              <Link href={`/dashboard/dues/households/${h.id}`} className="flex h-full flex-col rounded-card border border-border bg-surface p-4 hover:shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold">{h.name}</p>
                  <p className="shrink-0 font-display font-extrabold tabular">{rupiah(h.monthly_fee)}</p>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{h.members.map((m) => m.name).join(", ") || "Belum ada anggota"}</p>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                  {h.members.length > 1 ? (
                    <Badge tone="sky">
                      <Users className="size-3" aria-hidden /> {h.members.length} orang
                    </Badge>
                  ) : null}
                  {!h.is_active ? <Badge tone="gray">Nonaktif</Badge> : null}
                  {!h.host_eligible ? <Badge tone="gray">Tidak ikut arisan</Badge> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
