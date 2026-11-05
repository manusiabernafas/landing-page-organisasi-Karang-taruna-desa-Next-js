import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Boxes, HandHelping, History, MapPin, RotateCcw, Wrench } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getUnitByCode } from "@/lib/services/inventory";
import { BORROWING_STATUS, CONDITION, MAINTENANCE_STATUS, UNIT_STATUS } from "@/lib/utils/labels";
import { fmtDate, fmtDateTime, rupiah } from "@/lib/utils/format";
import { SITE_URL } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { ConditionBadge, UnitStatusBadge } from "@/components/inventory/unit-badges";
import { UnitQr } from "@/components/inventory/unit-qr";
import { CompleteMaintenanceButton, StartMaintenanceButton, UnitConditionForm } from "@/components/inventory/inventory-actions";

export async function generateMetadata({ params }: PageProps<"/dashboard/inventory/units/[code]">): Promise<Metadata> {
  const { code } = await params;
  return { title: `Unit ${decodeURIComponent(code).toUpperCase()}` };
}

export default async function UnitPage({ params }: PageProps<"/dashboard/inventory/units/[code]">) {
  const session = await requireSession();
  const { code: raw } = await params;
  const code = decodeURIComponent(raw).toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const data = await getUnitByCode(session.organization.id, code);
  if (!data) notFound();
  const { unit, history, borrowings, activeBorrowing, maintenance } = data;
  const canManage = can(session.profile.role, "inventory.manage");
  const openMaint = maintenance.find((m) => m.status !== "DONE");
  const scanUrl = `${SITE_URL}/inventory/scan/${unit.unit_code}`;

  return (
    <div className="space-y-5">
      <Link href={`/dashboard/inventory/${unit.item.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> {unit.item.name}
      </Link>

      <section className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-wood-100">
                {unit.item.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={unit.item.photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <ResourceIcon tone="wood">
                    <Boxes />
                  </ResourceIcon>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold text-grass-600">{unit.unit_code}</p>
                <h1 className="font-display text-2xl font-extrabold">{unit.item.name}</h1>
                <p className="text-sm text-muted">{unit.item.category?.name ?? "Inventaris"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <UnitStatusBadge status={unit.status} />
                  <ConditionBadge condition={unit.condition} />
                </div>
              </div>
            </div>
            {unit.item.location ? (
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <MapPin className="size-4" aria-hidden /> {unit.item.location}
              </p>
            ) : null}
            {unit.notes ? <p className="rounded-xl bg-bg-soft px-3 py-2 text-sm">Catatan: {unit.notes}</p> : null}

            <div id="aksi" className="scroll-mt-24 space-y-3 border-t border-border pt-4">
              <h2 className="font-display font-bold">Aksi unit</h2>
              {unit.status === "AVAILABLE" ? (
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={`/dashboard/borrowings/new?unit=${unit.unit_code}`}>
                    <HandHelping /> Pinjamkan
                  </ButtonLink>
                  {canManage ? <StartMaintenanceButton unitId={unit.id} /> : null}
                </div>
              ) : null}
              {unit.status === "BORROWED" && activeBorrowing ? (
                <div className="rounded-2xl border border-sky/30 bg-sky-100 p-4">
                  <p className="text-sm">
                    Sedang dipinjam <span className="font-semibold">{activeBorrowing.borrower_name}</span> untuk {activeBorrowing.purpose}. Kembali{" "}
                    {fmtDate(activeBorrowing.expected_return_date)}.
                  </p>
                  <ButtonLink href={`/dashboard/borrowings/${activeBorrowing.id}#kembali`} size="sm" className="mt-3">
                    <RotateCcw /> Proses pengembalian
                  </ButtonLink>
                </div>
              ) : null}
              {openMaint ? (
                <div className="rounded-2xl border border-gold/40 bg-gold-100 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Wrench className="size-4" aria-hidden /> Maintenance: {openMaint.issue}
                  </p>
                  <p className="text-xs text-muted">Mulai {fmtDate(openMaint.started_at)} · {MAINTENANCE_STATUS[openMaint.status].label}</p>
                  {canManage ? (
                    <div className="mt-3">
                      <CompleteMaintenanceButton id={openMaint.id} unitCode={unit.unit_code} />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {canManage && unit.status !== "BORROWED" ? (
                <div className="max-w-md pt-2">
                  <UnitConditionForm unitId={unit.id} condition={unit.condition} />
                </div>
              ) : null}
              {!canManage && unit.status !== "AVAILABLE" ? <p className="text-sm text-muted">Unit sedang tidak tersedia untuk dipinjam.</p> : null}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <UnitQr code={unit.unit_code} url={scanUrl} itemName={unit.item.name} />
            <p className="mt-3 text-center text-xs text-muted">Tempel QR di barang. Scan untuk melihat status tanpa login.</p>
          </CardBody>
        </Card>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card id="histori" className="scroll-mt-24">
          <CardHeader
            title="Histori unit"
            icon={
              <ResourceIcon tone="sky" size="sm">
                <History />
              </ResourceIcon>
            }
          />
          <CardBody>
            {history.length === 0 ? (
              <p className="text-sm text-muted">Belum ada histori.</p>
            ) : (
              <ol className="relative space-y-4 border-l-2 border-border pl-5">
                {history.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute top-1.5 -left-[27px] size-3 rounded-full bg-grass ring-4 ring-surface" aria-hidden />
                    <p className="text-sm font-semibold">{h.action}</p>
                    <p className="text-xs text-muted">
                      {h.from_status && h.to_status && h.from_status !== h.to_status ? (
                        <>
                          {UNIT_STATUS[h.from_status].label} <ArrowRight className="inline size-3" aria-hidden /> {UNIT_STATUS[h.to_status].label}
                        </>
                      ) : h.to_status ? (
                        UNIT_STATUS[h.to_status].label
                      ) : null}
                      {h.from_condition && h.to_condition && h.from_condition !== h.to_condition
                        ? ` · kondisi ${CONDITION[h.from_condition].label} → ${CONDITION[h.to_condition].label}`
                        : ""}
                    </p>
                    {h.note ? <p className="mt-0.5 text-xs">{h.note}</p> : null}
                    <p className="mt-0.5 text-[11px] text-subtle">
                      {fmtDateTime(h.created_at)}
                      {h.actorName ? ` · ${h.actorName}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Riwayat peminjaman" />
            <CardBody>
              {borrowings.length === 0 ? (
                <p className="text-sm text-muted">Unit ini belum pernah dipinjam.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {borrowings.map((b) =>
                    b.borrowing ? (
                      <li key={b.id}>
                        <Link href={`/dashboard/borrowings/${b.borrowing.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-grass-600">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{b.borrowing.borrower_name}</p>
                            <p className="text-xs text-muted">
                              {b.borrowing.borrowing_code} · {fmtDate(b.borrowing.borrow_date)}
                              {b.condition_before && b.condition_after ? ` · ${CONDITION[b.condition_before].label} → ${CONDITION[b.condition_after].label}` : ""}
                            </p>
                          </div>
                          <Badge tone={BORROWING_STATUS[b.borrowing.status].tone}>{BORROWING_STATUS[b.borrowing.status].label}</Badge>
                        </Link>
                      </li>
                    ) : null,
                  )}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Riwayat maintenance" />
            <CardBody>
              {maintenance.length === 0 ? (
                <p className="text-sm text-muted">Belum pernah maintenance.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {maintenance.map((m) => (
                    <li key={m.id} className="py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold">{m.issue}</p>
                        <Badge tone={MAINTENANCE_STATUS[m.status].tone}>{MAINTENANCE_STATUS[m.status].label}</Badge>
                      </div>
                      <p className="text-xs text-muted">
                        {fmtDate(m.started_at)}
                        {m.completed_at ? ` – ${fmtDate(m.completed_at)}` : ""}
                        {m.cost ? ` · ${rupiah(m.cost)}` : ""}
                        {m.notes ? ` · ${m.notes}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
