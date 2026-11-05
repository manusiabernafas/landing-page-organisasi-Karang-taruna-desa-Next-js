"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, HandCoins, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form";
import { payPeriodAction, waiveBillAction } from "@/lib/actions/dues";
import { todayJakartaClient } from "@/lib/utils/client-date";
import { PAYMENT_METHOD } from "@/lib/utils/labels";
import { cn } from "@/lib/utils/cn";

const CELL: Record<string, string> = {
  PAID: "bg-grass text-white dark:text-forest",
  PARTIAL: "bg-gold text-forest",
  UNPAID: "bg-danger-bg text-danger ring-1 ring-inset ring-danger/30",
  WAIVED: "bg-bg-soft text-muted",
  NONE: "text-subtle",
};
const SYMBOL: Record<string, string> = { PAID: "✓", PARTIAL: "½", UNPAID: "✗", WAIVED: "–", NONE: "·" };
const LABEL: Record<string, string> = { PAID: "Lunas", PARTIAL: "Kurang", UNPAID: "Belum bayar", WAIVED: "Dibebaskan", NONE: "Belum ditagih" };
const fmt = new Intl.NumberFormat("id-ID");
const rp = (n: number) => `Rp ${fmt.format(n)}`;

export interface CellBill {
  id: string;
  status: "PAID" | "PARTIAL" | "UNPAID" | "WAIVED";
  amount_due: number;
  amount_paid: number;
}

/**
 * Satu kotak di kartu iuran. Bendahara bisa langsung memencetnya untuk
 * menandai lunas bulan itu (masuk kas otomatis), membebaskan, atau melihat detail.
 */
export function CardCell({
  household,
  period,
  monthLabel,
  bill,
  accounts,
  defaultAccountId,
  canPay,
}: {
  household: { id: string; name: string; monthly_fee: number };
  period: string;
  monthLabel: string;
  bill: CellBill | null;
  accounts: { id: string; name: string }[];
  defaultAccountId?: string;
  canPay: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [date, setDate] = useState(todayJakartaClient());
  const [account, setAccount] = useState(defaultAccountId ?? accounts[0]?.id ?? "");
  const [method, setMethod] = useState<keyof typeof PAYMENT_METHOD>("CASH");
  const status = bill?.status ?? "NONE";
  const remaining = bill ? bill.amount_due - bill.amount_paid : household.monthly_fee;
  const payable = status === "UNPAID" || status === "PARTIAL" || (status === "NONE" && household.monthly_fee > 0);
  const title = `${household.name} · ${monthLabel}: ${LABEL[status]}${bill ? ` (${rp(bill.amount_paid)} / ${rp(bill.amount_due)})` : ""}`;

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message ?? "Tersimpan.");
        setOpen(false);
        router.refresh();
      } else toast.error(r.error);
    });

  const box = <span className={cn("inline-flex size-8 items-center justify-center rounded-md text-xs font-bold", CELL[status])}>{SYMBOL[status]}</span>;

  if (!canPay) {
    return (
      <span title={title} aria-label={title}>
        {box}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={title}
        aria-label={`${title}. Pencet untuk ${payable ? "menandai lunas" : "melihat detail"}.`}
        className="rounded-md transition-transform hover:scale-110 focus-visible:scale-110 active:scale-95"
      >
        {box}
      </button>
      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        size="sm"
        title={`${household.name}`}
        description={`Iuran ${monthLabel} · ${LABEL[status]}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Tutup
            </Button>
            {payable ? (
              <Button
                loading={pending}
                disabled={!account}
                onClick={() => run(() => payPeriodAction({ household_id: household.id, period, paid_at: date, account_id: account, payment_method: method }))}
              >
                {!pending ? <CheckCircle2 /> : null} Tandai lunas {rp(remaining)}
              </Button>
            ) : null}
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-bg-soft p-3 text-center text-sm">
            <div>
              <p className="text-xs text-muted">Tagihan</p>
              <p className="font-bold tabular">{rp(bill?.amount_due ?? household.monthly_fee)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Dibayar</p>
              <p className="font-bold tabular">{rp(bill?.amount_paid ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Sisa</p>
              <p className={cn("font-bold tabular", payable && "text-danger")}>{rp(status === "WAIVED" ? 0 : Math.max(0, remaining))}</p>
            </div>
          </div>
          {payable ? (
            <>
              <p className="text-sm text-muted">
                Pembayaran {rp(remaining)} dicatat khusus untuk <strong className="text-text">{monthLabel}</strong> dan langsung masuk kas.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Tanggal bayar" htmlFor={`d-${household.id}-${period}`}>
                  <Input id={`d-${household.id}-${period}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
                <Field label="Masuk ke" htmlFor={`a-${household.id}-${period}`}>
                  <Select id={`a-${household.id}-${period}`} value={account} onChange={(e) => setAccount(e.target.value)}>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Metode" htmlFor={`m-${household.id}-${period}`}>
                  <Select id={`m-${household.id}-${period}`} value={method} onChange={(e) => setMethod(e.target.value as keyof typeof PAYMENT_METHOD)}>
                    {Object.entries(PAYMENT_METHOD).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </>
          ) : status === "PAID" ? (
            <p className="text-sm text-muted">Bulan ini sudah lunas. Bila ada salah catat, batalkan pembayarannya dari halaman detail tagihan.</p>
          ) : null}
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {bill && status === "UNPAID" ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => confirm(`Bebaskan iuran ${household.name} bulan ${monthLabel}?`) && run(() => waiveBillAction(bill.id, true, "Dibebaskan dari kartu iuran"))}
              >
                <HandCoins /> Bebaskan bulan ini
              </Button>
            ) : null}
            {bill && status === "WAIVED" ? (
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => waiveBillAction(bill.id, false))}>
                <Undo2 /> Tagih lagi
              </Button>
            ) : null}
            <Link href={`/dashboard/dues/households/${household.id}`} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-grass-600 hover:bg-bg-soft">
              <ExternalLink className="size-4" /> Detail & riwayat
            </Link>
          </div>
        </div>
      </Dialog>
    </>
  );
}
