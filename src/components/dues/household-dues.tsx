import { Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { fmtDate, rupiah } from "@/lib/utils/format";
import type { Tone } from "@/lib/utils/labels";
import type { getHouseholdDetail } from "@/lib/services/dues";

export const DUES_STATUS: Record<string, { label: string; tone: Tone }> = {
  PAID: { label: "Lunas", tone: "green" },
  PARTIAL: { label: "Kurang", tone: "gold" },
  UNPAID: { label: "Belum bayar", tone: "red" },
  WAIVED: { label: "Dibebaskan", tone: "gray" },
};

type Detail = NonNullable<Awaited<ReturnType<typeof getHouseholdDetail>>>;

/** Ringkasan tagihan satu rumah (dipakai anggota untuk melihat iurannya sendiri). */
export function HouseholdDues({ detail }: { detail: Detail }) {
  const { household, bills, payments } = detail;
  const owe = bills.filter((b) => b.status === "UNPAID" || b.status === "PARTIAL").reduce((a, b) => a + b.amount_due - b.amount_paid, 0);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-border bg-surface p-4 sm:col-span-1">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Home className="size-4 text-grass" aria-hidden /> {household.name}
          </p>
          <p className="mt-1 text-xs text-muted">{household.members.map((m) => m.name).join(", ")}</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="text-xs text-muted">Iuran per bulan</p>
          <p className="font-display text-2xl font-extrabold tabular">{rupiah(household.monthly_fee)}</p>
        </div>
        <div className={`rounded-card border p-4 ${owe > 0 ? "border-danger/30 bg-danger-bg" : "border-grass/30 bg-grass-100"}`}>
          <p className="text-xs text-muted">Belum dibayar</p>
          <p className="font-display text-2xl font-extrabold tabular">{owe > 0 ? rupiah(owe) : "Lunas semua"}</p>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Tagihan per bulan" />
          <CardBody>
            {bills.length === 0 ? (
              <p className="text-sm text-muted">Belum ada tagihan.</p>
            ) : (
              <ul className="divide-y divide-border">
                {bills.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="font-semibold capitalize">{fmtDate(b.period, "MMMM yyyy")}</p>
                      <p className="text-xs text-muted tabular">
                        {rupiah(b.amount_paid)} / {rupiah(b.amount_due)}
                      </p>
                    </div>
                    <Badge tone={DUES_STATUS[b.status].tone}>{DUES_STATUS[b.status].label}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Riwayat pembayaran" />
          <CardBody>
            {payments.length === 0 ? (
              <p className="text-sm text-muted">Belum ada pembayaran.</p>
            ) : (
              <ul className="divide-y divide-border">
                {payments.map((p) => (
                  <li key={p.id} className="py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className={`font-bold tabular ${p.cancelled_at ? "text-muted line-through" : ""}`}>{rupiah(p.amount)}</p>
                      <p className="text-xs text-muted">{fmtDate(p.paid_at)}</p>
                    </div>
                    <p className="text-xs text-muted">
                      Untuk {p.allocations.map((a) => fmtDate(a.period, "MMM yyyy")).join(", ") || "-"}
                      {p.cancelled_at ? ` · dibatalkan (${p.cancel_reason})` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
