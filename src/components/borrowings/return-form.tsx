"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { returnBorrowingAction } from "@/lib/actions/borrowings";
import { todayJakartaClient } from "@/lib/utils/client-date";
import { cn } from "@/lib/utils/cn";
import type { ItemCondition } from "@/types/db";

const OPTIONS: { value: ItemCondition; label: string; tone: string }[] = [
  { value: "EXCELLENT", label: "Sangat baik", tone: "border-grass bg-grass-100 text-grass-600" },
  { value: "GOOD", label: "Baik", tone: "border-sky bg-sky-100 text-sky-600" },
  { value: "FAIR", label: "Cukup", tone: "border-gold bg-gold-100 text-gold-600" },
  { value: "DAMAGED", label: "Rusak", tone: "border-danger bg-danger-bg text-danger" },
  { value: "LOST", label: "Hilang", tone: "border-border-strong bg-bg-soft text-muted" },
];

export function ReturnForm({
  borrowingId,
  borrowDate,
  items,
}: {
  borrowingId: string;
  borrowDate: string;
  items: { unitId: string; code: string; itemName: string; before: ItemCondition | null }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [date, setDate] = useState(todayJakartaClient());
  const [state, setState] = useState<Record<string, { condition?: ItemCondition; notes: string }>>(
    Object.fromEntries(items.map((i) => [i.unitId, { condition: undefined, notes: "" }])),
  );
  const [error, setError] = useState<string | null>(null);
  const missing = items.filter((i) => !state[i.unitId]?.condition).length;

  function setAll(c: ItemCondition) {
    setState((s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, { ...v, condition: c }])));
  }

  function submit() {
    setError(null);
    if (missing > 0) return setError(`Kondisi setelah pinjam wajib diisi untuk ${missing} unit lagi.`);
    if (date < borrowDate) return setError("Tanggal kembali tidak boleh sebelum tanggal pinjam.");
    const damaged = items.filter((i) => state[i.unitId].condition === "DAMAGED" || state[i.unitId].condition === "LOST").length;
    if (damaged && !confirm(`${damaged} unit ditandai rusak/hilang. Unit rusak otomatis masuk maintenance. Lanjutkan?`)) return;
    start(async () => {
      const res = await returnBorrowingAction(borrowingId, {
        return_date: date,
        items: items.map((i) => ({ unit_id: i.unitId, condition_after: state[i.unitId].condition!, notes: state[i.unitId].notes })),
      });
      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else setError(res.error);
    });
  }

  return (
    <section id="kembali" className="scroll-mt-24 rounded-card border-2 border-grass/40 bg-surface">
      <div className="border-b border-border p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <ClipboardCheck className="size-5 text-grass" aria-hidden /> Pengembalian & inspeksi
        </h2>
        <p className="text-sm text-muted">Cek setiap unit. Kondisi Rusak → otomatis Maintenance, Hilang → status Hilang.</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Field label="Tanggal kembali" htmlFor="ret-date" className="w-44">
            <Input id="ret-date" type="date" value={date} min={borrowDate} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-1.5 pb-1">
            <span className="self-center text-xs font-semibold text-muted">Isi semua:</span>
            {OPTIONS.slice(0, 3).map((o) => (
              <button key={o.value} type="button" onClick={() => setAll(o.value)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-bg-soft">
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <ul className="divide-y divide-border">
        {items.map((i) => {
          const s = state[i.unitId];
          return (
            <li key={i.unitId} className="p-4 sm:px-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p>
                  <span className="font-mono font-bold">{i.code}</span> <span className="text-sm text-muted">{i.itemName}</span>
                </p>
                <p className="text-xs text-muted">Sebelum: {OPTIONS.find((o) => o.value === i.before)?.label ?? "-"}</p>
              </div>
              <fieldset className="mt-2">
                <legend className="sr-only">Kondisi setelah pinjam {i.code}</legend>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                  {OPTIONS.map((o) => (
                    <label
                      key={o.value}
                      className={cn(
                        "flex min-h-10 cursor-pointer items-center justify-center rounded-lg border px-2 text-xs font-bold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                        s.condition === o.value ? o.tone : "border-border hover:bg-bg-soft",
                      )}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name={`c-${i.unitId}`}
                        value={o.value}
                        checked={s.condition === o.value}
                        onChange={() => setState((st) => ({ ...st, [i.unitId]: { ...st[i.unitId], condition: o.value } }))}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              {s.condition === "DAMAGED" || s.condition === "LOST" || s.condition === "FAIR" ? (
                <Input
                  className="mt-2"
                  aria-label={`Catatan ${i.code}`}
                  placeholder="Catatan kerusakan (contoh: kaki kursi patah)"
                  value={s.notes}
                  onChange={(e) => setState((st) => ({ ...st, [i.unitId]: { ...st[i.unitId], notes: e.target.value } }))}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-2 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        {error ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        ) : (
          <p className="text-sm text-muted">{missing ? `${missing} unit belum diinspeksi.` : "Semua unit sudah diinspeksi."}</p>
        )}
        <Button onClick={submit} loading={pending} size="lg">
          Simpan pengembalian
        </Button>
      </div>
    </section>
  );
}
