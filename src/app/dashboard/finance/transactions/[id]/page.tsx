import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, FileText, Pencil, RotateCcw, ShieldCheck, Trash2, Undo2 } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getTransaction } from "@/lib/services/finance";
import { fmtDate, fmtDateTime, rupiah } from "@/lib/utils/format";
import { FINANCE_TYPE, PAYMENT_METHOD } from "@/lib/utils/labels";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { ActionButton } from "@/components/ui/action-button";
import { approveTransactionAction, deleteTransactionAction, reverseTransactionAction, setTransactionPublicAction } from "@/lib/actions/finance";

export const metadata: Metadata = { title: "Detail Transaksi" };

export default async function TransactionDetail({ params, searchParams }: PageProps<"/dashboard/finance/transactions/[id]">) {
  const session = await requirePermission("finance.view");
  const { id } = await params;
  const sp = await searchParams;
  const tx = await getTransaction(id);
  if (!tx) notFound();
  const role = session.profile.role;
  const canApprove = can(role, "finance.approve");
  const canEdit = !tx.is_approved && (canApprove || tx.created_by === session.userId);
  const t = FINANCE_TYPE[tx.type];

  const rows: [string, React.ReactNode][] = [
    ["Kode", <span key="c" className="font-mono">{tx.transaction_code}</span>],
    ["Tanggal", fmtDate(tx.transaction_date, "EEEE, d MMMM yyyy")],
    [tx.type === "TRANSFER" ? "Dari" : "Akun", tx.account?.name ?? "-"],
    ...(tx.type === "TRANSFER" ? ([["Ke", tx.to_account?.name ?? "-"]] as [string, React.ReactNode][]) : []),
    ...(tx.category ? ([["Kategori", tx.category.name]] as [string, React.ReactNode][]) : []),
    ...(tx.event
      ? ([["Event", <Link key="e" href={`/dashboard/events/${tx.event.id}?tab=finance`} className="font-semibold text-grass-600 hover:underline">{tx.event.name}</Link>]] as [string, React.ReactNode][])
      : []),
    ["Metode", PAYMENT_METHOD[tx.payment_method]],
    ["Dicatat oleh", `${tx.createdByName ?? "Sistem"} · ${fmtDateTime(tx.created_at)}`],
    ["Disetujui oleh", tx.is_approved ? `${tx.approvedByName ?? "Sistem"} · ${fmtDateTime(tx.approved_at)}` : "Belum disetujui"],
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/dashboard/finance/transactions" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Semua transaksi
      </Link>
      {sp.reversed ? (
        <p role="status" className="rounded-xl bg-grass-100 px-4 py-3 text-sm font-medium text-grass-600">
          Reversal tercatat. Saldo sudah dikoreksi tanpa menghapus riwayat.
        </p>
      ) : null}
      <Card>
        <CardBody className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={t.tone}>{t.label}</Badge>
                {tx.is_approved ? <Badge tone="green">Disetujui</Badge> : <Badge tone="gold">Menunggu persetujuan</Badge>}
                {tx.is_public ? <Badge tone="sky">Publik</Badge> : <Badge tone="gray">Internal</Badge>}
                {tx.reversal_of ? <Badge tone="wood">Reversal</Badge> : null}
              </div>
              <h2 className="mt-2 font-display text-xl font-bold">{tx.description ?? tx.category?.name ?? "Transaksi"}</h2>
            </div>
            <p
              className={cn(
                "font-display text-3xl font-extrabold tabular",
                tx.type === "INCOME" && "text-success",
                tx.type === "EXPENSE" && "text-danger",
                tx.type === "TRANSFER" && "text-sky-600",
              )}
            >
              {tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "−" : ""}
              {rupiah(tx.amount)}
            </p>
          </div>
          <dl className="divide-y divide-border rounded-2xl border border-border">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[120px_1fr] gap-3 px-4 py-2.5 text-sm sm:grid-cols-[160px_1fr]">
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {tx.original ? (
            <p className="text-sm text-muted">
              Koreksi untuk{" "}
              <Link href={`/dashboard/finance/transactions/${tx.original.id}`} className="font-mono font-semibold text-grass-600 hover:underline">
                {tx.original.transaction_code}
              </Link>
            </p>
          ) : null}
          {tx.reversedBy ? (
            <p className="flex items-center gap-2 rounded-xl bg-wood-100 px-4 py-3 text-sm">
              <Undo2 className="size-4" aria-hidden /> Sudah dikoreksi oleh reversal{" "}
              <Link href={`/dashboard/finance/transactions/${tx.reversedBy.id}`} className="font-mono font-semibold hover:underline">
                {tx.reversedBy.transaction_code}
              </Link>
            </p>
          ) : null}
          {tx.attachmentUrl ? (
            <a href={tx.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-bg-soft">
              <FileText className="size-4" aria-hidden /> Lihat lampiran bukti
            </a>
          ) : null}
        </CardBody>
      </Card>

      <div className="flex flex-wrap gap-2">
        {!tx.is_approved && canApprove ? (
          <ActionButton action={approveTransactionAction.bind(null, tx.id)} variant="primary" icon={<CheckCircle2 />}>
            Setujui transaksi
          </ActionButton>
        ) : null}
        {canEdit ? (
          <ButtonLink href={`/dashboard/finance/transactions/${tx.id}/edit`} variant="secondary">
            <Pencil /> Ubah
          </ButtonLink>
        ) : null}
        {tx.is_approved && canApprove ? (
          <ActionButton
            action={setTransactionPublicAction.bind(null, tx.id, !tx.is_public)}
            variant="secondary"
            icon={tx.is_public ? <EyeOff /> : <Eye />}
          >
            {tx.is_public ? "Sembunyikan dari publik" : "Tampilkan ke publik"}
          </ActionButton>
        ) : null}
        {tx.is_approved && canApprove && !tx.reversedBy && !tx.reversal_of ? (
          <ConfirmAction
            label="Reversal"
            icon={<RotateCcw />}
            variant="secondary"
            size="md"
            confirmVariant="primary"
            title="Buat reversal transaksi?"
            description="Transaksi yang sudah disetujui tidak diedit atau dihapus. Reversal membuat transaksi kebalikan dengan nominal sama sehingga saldo terkoreksi dan riwayat tetap utuh."
            confirmLabel="Buat reversal"
            withReason
            reasonLabel="Alasan koreksi"
            action={reverseTransactionAction.bind(null, tx.id)}
          />
        ) : null}
        {canEdit || (role === "SUPER_ADMIN" && !tx.reversedBy) ? (
          <ConfirmAction
            label="Hapus"
            icon={<Trash2 />}
            size="md"
            title="Hapus transaksi?"
            description={
              tx.is_approved
                ? "Transaksi yang sudah tercatat sebaiknya tidak dihapus. Pertimbangkan melakukan reversal. Penghapusan tetap tercatat di audit log."
                : "Transaksi yang belum disetujui ini akan dihapus. Tindakan tercatat di audit log."
            }
            confirmLabel="Ya, hapus"
            action={deleteTransactionAction.bind(null, tx.id)}
          />
        ) : null}
      </div>
      <p className="flex items-center gap-2 text-xs text-muted">
        <ShieldCheck className="size-4 text-grass" aria-hidden /> Semua perubahan pada transaksi ini tercatat di audit log.
      </p>
    </div>
  );
}
