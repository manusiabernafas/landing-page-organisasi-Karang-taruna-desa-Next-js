"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Banknote, CalendarPlus, UsersRound } from "lucide-react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { createSingleHouseholdsAction, generateBillsAction, recordPaymentAction } from "@/lib/actions/dues";
import { todayJakartaClient } from "@/lib/utils/client-date";
import { PAYMENT_METHOD } from "@/lib/utils/labels";

const fmt = new Intl.NumberFormat("id-ID");
const rp = (n: number) => `Rp ${fmt.format(n)}`;

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, done?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message ?? "Tersimpan.");
        done?.();
        router.refresh();
      } else toast.error(r.error);
    });
  return { pending, run };
}

export function PayButton({
  household,
  outstanding,
  accounts,
  defaultAccountId,
  size = "sm",
  variant = "primary",
}: {
  household: { id: string; name: string; monthly_fee: number; members: string[] };
  outstanding: number;
  accounts: { id: string; name: string }[];
  defaultAccountId?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  const { pending, run } = useRun();
  const [open, setOpen] = useState(false);
  const suggest = outstanding > 0 ? outstanding : household.monthly_fee;
  const [amount, setAmount] = useState(suggest);
  const [date, setDate] = useState(todayJakartaClient());
  const [account, setAccount] = useState(defaultAccountId ?? accounts[0]?.id ?? "");
  const [method, setMethod] = useState<keyof typeof PAYMENT_METHOD>("CASH");
  const [note, setNote] = useState("");
  const advance = Math.max(0, amount - outstanding);
  const advanceMonths = household.monthly_fee > 0 ? advance / household.monthly_fee : 0;

  return (
    <>
      <Button
        size={size}
        variant={variant}
        onClick={() => {
          setAmount(suggest);
          setOpen(true);
        }}
      >
        <Banknote /> Catat bayar
      </Button>
      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title={`Bayar iuran · ${household.name}`}
        description={household.members.length > 1 ? `Satu tagihan untuk ${household.members.join(", ")}.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              loading={pending}
              disabled={!(amount > 0) || !account}
              onClick={() =>
                run(
                  () => recordPaymentAction({ household_id: household.id, amount, paid_at: date, account_id: account, payment_method: method, note }),
                  () => setOpen(false),
                )
              }
            >
              Simpan pembayaran
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-bg-soft p-3 text-sm">
            <div>
              <p className="text-xs text-muted">Iuran per bulan</p>
              <p className="font-bold tabular">{rp(household.monthly_fee)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Belum dibayar (s/d bulan ini)</p>
              <p className="font-bold tabular">{rp(outstanding)}</p>
            </div>
          </div>
          <Field label="Nominal dibayar" htmlFor="pay-amount" required hint="Boleh sebagian (cicil) atau lebih (rapel/bayar di muka).">
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-bold text-muted">Rp</span>
              <Input
                id="pay-amount"
                inputMode="numeric"
                className="h-12 pl-11 font-display text-xl font-extrabold tabular"
                value={amount ? fmt.format(amount) : ""}
                onChange={(e) => setAmount(Number(e.target.value.replace(/[^\d]/g, "").slice(0, 10)) || 0)}
              />
            </div>
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {[household.monthly_fee, household.monthly_fee * 3, household.monthly_fee * 6, outstanding]
              .filter((v, i, a) => v > 0 && a.indexOf(v) === i)
              .map((v) => (
                <button key={v} type="button" onClick={() => setAmount(v)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-bg-soft">
                  {v === outstanding ? "Lunasi semua" : `${v / household.monthly_fee} bulan`} · {rp(v)}
                </button>
              ))}
          </div>
          {amount > 0 ? (
            <p className="rounded-xl bg-grass-100 px-3 py-2 text-sm text-grass-600">
              {amount <= outstanding
                ? amount === outstanding
                  ? "Semua tagihan yang belum dibayar akan lunas."
                  : `Dialokasikan ke tagihan tertua dulu. Sisa belum dibayar ${rp(outstanding - amount)}.`
                : `Melunasi semua tunggakan, sisanya ${rp(advance)} jadi bayar di muka ≈ ${fmt.format(Math.round(advanceMonths * 10) / 10)} bulan.`}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tanggal" htmlFor="pay-date">
              <Input id="pay-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Masuk ke akun" htmlFor="pay-acc">
              <Select id="pay-acc" value={account} onChange={(e) => setAccount(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Metode" htmlFor="pay-method">
              <Select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value as keyof typeof PAYMENT_METHOD)}>
                {Object.entries(PAYMENT_METHOD).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Catatan" htmlFor="pay-note">
            <Textarea id="pay-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsional, contoh: dititipkan lewat Budi" />
          </Field>
        </div>
      </Dialog>
    </>
  );
}

export function GenerateBillsButton({ period, label }: { period: string; label: string }) {
  const { pending, run } = useRun();
  return (
    <Button variant="gold" loading={pending} onClick={() => run(() => generateBillsAction(period))}>
      {!pending ? <CalendarPlus /> : null} {label}
    </Button>
  );
}

export function CreateSinglesButton({ count }: { count: number }) {
  const { pending, run } = useRun();
  const [fee, setFee] = useState(10000);
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <UsersRound /> Buat tagihan untuk {count} anggota tanpa tagihan
      </Button>
      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Buat tagihan perorangan"
        description={`${count} anggota aktif belum masuk tagihan mana pun. Masing-masing akan dibuatkan satu tagihan sendiri.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button loading={pending} onClick={() => run(() => createSingleHouseholdsAction(fee), () => setOpen(false))}>
              Buat {count} tagihan
            </Button>
          </>
        }
      >
        <Field label="Iuran per bulan (Rp)" htmlFor="single-fee">
          <Input id="single-fee" inputMode="numeric" value={fmt.format(fee)} onChange={(e) => setFee(Number(e.target.value.replace(/[^\d]/g, "")) || 0)} />
        </Field>
      </Dialog>
    </>
  );
}
