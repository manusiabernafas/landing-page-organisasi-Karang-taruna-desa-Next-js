import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, Dices, HandCoins, Undo2 } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getHouseholdDetail, getHouseholdsForManage } from "@/lib/services/dues";
import { fmtDate, rupiah } from "@/lib/utils/format";
import { PAYMENT_METHOD } from "@/lib/utils/labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { ActionButton } from "@/components/ui/action-button";
import { DUES_STATUS } from "@/components/dues/household-dues";
import { PayButton } from "@/components/dues/dues-actions";
import { HouseholdForm } from "@/components/dues/household-form";
import { cancelPaymentAction, waiveBillAction } from "@/lib/actions/dues";

export const metadata: Metadata = { title: "Detail Tagihan" };

export default async function HouseholdDetailPage({ params }: PageProps<"/dashboard/dues/households/[id]">) {
  const session = await requirePermission("dues.view");
  const { id } = await params;
  const detail = await getHouseholdDetail(id);
  if (!detail) notFound();
  const { household: h, bills, payments, hosts } = detail;
  const role = session.profile.role;
  const canPay = can(role, "dues.pay");
  const canManage = can(role, "households.manage");
  const supabase = await createClient();
  const [accounts, manage] = await Promise.all([
    supabase.from("finance_accounts").select("id,name,type").eq("organization_id", session.organization.id).eq("is_active", true).neq("type", "EVENT").order("type"),
    canManage ? getHouseholdsForManage(session.organization.id) : Promise.resolve(null),
  ]);
  const accs = (accounts.data ?? []) as { id: string; name: string; type: string }[];
  const today = new Date().toISOString().slice(0, 7);
  const outstanding = bills
    .filter((b) => (b.status === "UNPAID" || b.status === "PARTIAL") && b.period.slice(0, 7) <= today)
    .reduce((a, b) => a + b.amount_due - b.amount_paid, 0);
  const totalPaid = payments.filter((p) => !p.cancelled_at).reduce((a, p) => a + p.amount, 0);
  const names = manage ? new Map(manage.houses.map((x) => [x.id, x.name])) : new Map();

  return (
    <div className="space-y-5">
      <Link href="/dashboard/dues/households" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Daftar tagihan
      </Link>
      <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-extrabold">{h.name}</h2>
          <p className="text-sm text-muted">{h.members.map((m) => m.name).join(", ")}</p>
          {h.address ? <p className="text-xs text-muted">{h.address}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs text-muted">Per bulan</p>
            <p className="font-display text-xl font-extrabold tabular">{rupiah(h.monthly_fee)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Belum dibayar</p>
            <p className={`font-display text-xl font-extrabold tabular ${outstanding > 0 ? "text-danger" : "text-success"}`}>{outstanding > 0 ? rupiah(outstanding) : "Lunas"}</p>
          </div>
          {canPay && accs.length ? (
            <PayButton
              household={{ id: h.id, name: h.name, monthly_fee: h.monthly_fee, members: h.members.map((m) => m.name) }}
              outstanding={outstanding}
              accounts={accs}
              defaultAccountId={accs.find((a) => a.type === "CASH")?.id}
              size="md"
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Tagihan per bulan" description={`Total dibayar sepanjang waktu ${rupiah(totalPaid)}`} />
          <CardBody>
            {bills.length === 0 ? (
              <p className="text-sm text-muted">Belum ada tagihan.</p>
            ) : (
              <ul className="divide-y divide-border">
                {bills.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div>
                      <p className="font-semibold capitalize">{fmtDate(b.period, "MMMM yyyy")}</p>
                      <p className="text-xs text-muted tabular">
                        {rupiah(b.amount_paid)} / {rupiah(b.amount_due)}
                        {b.notes ? ` · ${b.notes}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={DUES_STATUS[b.status].tone}>{DUES_STATUS[b.status].label}</Badge>
                      {canPay && b.status === "UNPAID" ? (
                        <ConfirmAction
                          label="Bebaskan"
                          icon={<HandCoins />}
                          variant="ghost"
                          confirmVariant="primary"
                          title="Bebaskan tagihan bulan ini?"
                          description="Gunakan untuk anggota yang sedang merantau, sakit, atau alasan lain yang disepakati. Tagihan tidak dihitung sebagai tunggakan."
                          confirmLabel="Bebaskan"
                          withReason
                          reasonLabel="Alasan"
                          action={waiveBillAction.bind(null, b.id, true)}
                        />
                      ) : null}
                      {canPay && b.status === "WAIVED" ? (
                        <ActionButton action={waiveBillAction.bind(null, b.id, false, undefined)} variant="ghost" size="sm" icon={<Undo2 />}>
                          Tagih lagi
                        </ActionButton>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <div className="space-y-5">
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
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted">
                            {fmtDate(p.paid_at)} · {PAYMENT_METHOD[p.payment_method as keyof typeof PAYMENT_METHOD]}
                          </p>
                          {canPay && !p.cancelled_at ? (
                            <ConfirmAction
                              label="Batal"
                              icon={<Ban />}
                              variant="ghost"
                              title="Batalkan pembayaran ini?"
                              description="Pakai bila pembayaran salah catat. Tagihan kembali terbuka dan kas dikoreksi otomatis dengan transaksi reversal — riwayat tidak dihapus."
                              confirmLabel="Batalkan pembayaran"
                              withReason
                              reasonLabel="Alasan pembatalan"
                              action={cancelPaymentAction.bind(null, p.id)}
                            />
                          ) : null}
                        </div>
                      </div>
                      <p className="text-xs text-muted">
                        Untuk {p.allocations.map((a) => fmtDate(a.period, "MMM yyyy")).join(", ") || "-"}
                        {p.note ? ` · ${p.note}` : ""}
                        {p.cancelled_at ? ` · dibatalkan: ${p.cancel_reason}` : ""}
                      </p>
                      {p.finance_transaction_id && can(role, "finance.view") ? (
                        <Link href={`/dashboard/finance/transactions/${p.finance_transaction_id}`} className="text-xs font-semibold text-grass-600 hover:underline">
                          Lihat di kas
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Tuan rumah rapat" icon={<Dices className="size-5 text-grass" aria-hidden />} />
            <CardBody>
              {hosts.length === 0 ? (
                <p className="text-sm text-muted">{h.host_eligible ? "Belum pernah ketempatan rapat." : "Rumah ini tidak ikut arisan tuan rumah rapat."}</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {hosts.map((x) => (
                    <li key={x.id}>
                      Tahun {x.year}
                      {x.meeting_date ? ` · rapat ${fmtDate(x.meeting_date)}` : ""} · {x.method === "RANDOM" ? "hasil kocokan" : "ditetapkan"}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {canManage && manage ? (
        <Card>
          <CardHeader title="Ubah tagihan" description="Gabungkan kakak-adik, ubah nominal, atau nonaktifkan tagihan." />
          <CardBody>
            <HouseholdForm
              editId={h.id}
              defaults={{
                name: h.name,
                address: h.address ?? "",
                monthly_fee: h.monthly_fee,
                is_active: h.is_active,
                host_eligible: h.host_eligible,
                notes: h.notes ?? "",
                member_ids: h.members.map((m) => m.id),
              }}
              members={manage.members.map((m) => ({ ...m, household_name: m.household_id ? names.get(m.household_id) ?? null : null }))}
            />
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
