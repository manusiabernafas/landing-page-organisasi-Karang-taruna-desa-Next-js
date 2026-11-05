import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, Check, CheckCircle2, PackageCheck, Phone, X } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getBorrowing } from "@/lib/services/borrowings";
import { BORROWING_STATUS, CONDITION, UNIT_STATUS } from "@/lib/utils/labels";
import { countdownLabel, daysUntil, fmtDate, fmtDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/action-button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { ReturnForm } from "@/components/borrowings/return-form";
import { cancelBorrowingAction, decideBorrowingAction, handoverBorrowingAction } from "@/lib/actions/borrowings";

export const metadata: Metadata = { title: "Detail Peminjaman" };

const STEPS = [
  { key: "REQUESTED", label: "Pengajuan" },
  { key: "APPROVED", label: "Disetujui" },
  { key: "BORROWED", label: "Dipinjam" },
  { key: "RETURNED", label: "Dikembalikan & diinspeksi" },
];

export default async function BorrowingDetailPage({ params }: PageProps<"/dashboard/borrowings/[id]">) {
  const session = await requireSession();
  const { id } = await params;
  const b = await getBorrowing(id);
  if (!b) notFound();
  const canApprove = can(session.profile.role, "borrowing.approve");
  const st = BORROWING_STATUS[b.status];
  const stepIndex = STEPS.findIndex((s) => s.key === b.status);
  const ended = b.status === "REJECTED" || b.status === "CANCELLED";
  const d = daysUntil(b.expected_return_date);
  const canCancel = ["REQUESTED", "APPROVED"].includes(b.status) && (canApprove || b.created_by === session.userId);

  return (
    <div className="space-y-5">
      <Link href="/dashboard/borrowings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Semua peminjaman
      </Link>

      <Card>
        <CardBody className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-sm text-muted">{b.borrowing_code}</p>
              <h2 className="font-display text-2xl font-extrabold">{b.borrower_name}</h2>
              <p className="text-muted">{b.purpose}</p>
              {b.event ? (
                <Link href={`/dashboard/events/${b.event.id}?tab=inventory`} className="mt-1 inline-block text-sm font-semibold text-grass-600 hover:underline">
                  Event: {b.event.name}
                </Link>
              ) : null}
            </div>
            <div className="flex flex-col items-start gap-1.5 sm:items-end">
              <Badge tone={st.tone}>{st.label}</Badge>
              {b.status === "BORROWED" ? (
                <Badge tone={d < 0 ? "red" : d <= 1 ? "gold" : "gray"}>{d < 0 ? `Terlambat ${Math.abs(d)} hari` : `Kembali ${countdownLabel(b.expected_return_date).toLowerCase()}`}</Badge>
              ) : null}
            </div>
          </div>

          {/* Stepper alur */}
          <ol className="grid grid-cols-4 gap-1" aria-label="Alur peminjaman">
            {STEPS.map((s, i) => {
              const done = !ended && (stepIndex > i || b.status === "RETURNED");
              const current = !ended && stepIndex === i && b.status !== "RETURNED";
              return (
                <li key={s.key} className="flex flex-col items-center text-center" aria-current={current ? "step" : undefined}>
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold",
                      done && "border-grass bg-grass text-white dark:text-forest",
                      current && "border-gold bg-gold-100 text-gold-600",
                      !done && !current && "border-border text-subtle",
                    )}
                  >
                    {done ? <Check className="size-4" /> : i + 1}
                  </span>
                  <span className={cn("mt-1.5 text-[11px] leading-tight font-semibold sm:text-xs", current ? "text-text" : "text-muted")}>{s.label}</span>
                </li>
              );
            })}
          </ol>
          {ended ? <p className="rounded-xl bg-bg-soft px-4 py-3 text-sm">Peminjaman ini {b.status === "REJECTED" ? "ditolak" : "dibatalkan"}. Unit tidak berubah status.</p> : null}

          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted">Tanggal pinjam</dt>
              <dd className="font-semibold">{fmtDate(b.borrow_date, "EEE, d MMM yyyy")}</dd>
            </div>
            <div>
              <dt className="text-muted">Rencana kembali</dt>
              <dd className="font-semibold">{fmtDate(b.expected_return_date, "EEE, d MMM yyyy")}</dd>
            </div>
            <div>
              <dt className="text-muted">Dikembalikan</dt>
              <dd className="font-semibold">{b.actual_return_date ? fmtDate(b.actual_return_date, "EEE, d MMM yyyy") : "-"}</dd>
            </div>
            <div>
              <dt className="text-muted">Kontak</dt>
              <dd className="font-semibold">
                {b.borrower_phone ? (
                  <a href={`tel:${b.borrower_phone}`} className="inline-flex items-center gap-1 text-grass-600 hover:underline">
                    <Phone className="size-3.5" aria-hidden /> {b.borrower_phone}
                  </a>
                ) : (
                  "-"
                )}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted">
            Diajukan oleh {b.createdByName ?? "pengurus"} · {fmtDateTime(b.created_at)}
            {b.approved_at ? ` · diproses ${b.approvedByName ?? "pengurus"} ${fmtDateTime(b.approved_at)}` : ""}
          </p>
          {b.notes ? <p className="rounded-xl bg-bg-soft px-4 py-3 text-sm whitespace-pre-line">{b.notes}</p> : null}

          <div className="flex flex-wrap gap-2">
            {b.status === "REQUESTED" && canApprove ? (
              <>
                <ActionButton action={decideBorrowingAction.bind(null, b.id, true, undefined)} icon={<CheckCircle2 />}>
                  Setujui
                </ActionButton>
                <ConfirmAction
                  label="Tolak"
                  icon={<X />}
                  size="md"
                  title="Tolak pengajuan?"
                  description="Peminjam perlu tahu alasannya. Unit tetap tersedia untuk peminjaman lain."
                  confirmLabel="Tolak pengajuan"
                  withReason
                  reasonLabel="Alasan penolakan"
                  action={decideBorrowingAction.bind(null, b.id, false)}
                />
              </>
            ) : null}
            {b.status === "APPROVED" && canApprove ? (
              <ActionButton action={handoverBorrowingAction.bind(null, b.id)} icon={<PackageCheck />}>
                Serahkan barang
              </ActionButton>
            ) : null}
            {canCancel ? (
              <ConfirmAction
                label="Batalkan"
                icon={<Ban />}
                size="md"
                title="Batalkan peminjaman?"
                description="Pengajuan dibatalkan dan unit kembali bisa dipinjam orang lain."
                confirmLabel="Ya, batalkan"
                action={cancelBorrowingAction.bind(null, b.id)}
              />
            ) : null}
          </div>
        </CardBody>
      </Card>

      {b.status === "BORROWED" && canApprove ? (
        <ReturnForm
          borrowingId={b.id}
          borrowDate={b.borrow_date}
          items={b.items.map((i) => ({ unitId: i.inventory_unit_id, code: i.unit?.unit_code ?? "-", itemName: i.unit?.item?.name ?? "", before: i.condition_before }))}
        />
      ) : null}

      <Card>
        <CardHeader title={`Barang dipinjam (${b.items.length} unit)`} />
        <CardBody>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {b.items.map((i) => (
              <li key={i.id}>
                <Link href={`/dashboard/inventory/units/${i.unit?.unit_code}`} className="block rounded-xl border border-border p-3 hover:bg-surface-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold">{i.unit?.unit_code}</span>
                    {i.unit ? <Badge tone={UNIT_STATUS[i.unit.status].tone}>{UNIT_STATUS[i.unit.status].label}</Badge> : null}
                  </div>
                  <p className="text-xs text-muted">{i.unit?.item?.name}</p>
                  <p className="mt-1 text-xs">
                    {i.condition_before ? CONDITION[i.condition_before].label : "—"} → {i.condition_after ? <span className="font-semibold">{CONDITION[i.condition_after].label}</span> : "belum kembali"}
                  </p>
                  {i.notes ? <p className="mt-1 text-xs text-muted">{i.notes}</p> : null}
                </Link>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
