"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CashflowChart } from "@/components/finance/cashflow-chart";
import { cashflowAction } from "@/lib/actions/dashboard";
import { rupiah } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Range = "7d" | "30d" | "3m" | "1y";
const RANGES: { key: Range; label: string; bucket: "day" | "week" | "month" }[] = [
  { key: "7d", label: "7 hari", bucket: "day" },
  { key: "30d", label: "30 hari", bucket: "day" },
  { key: "3m", label: "3 bulan", bucket: "week" },
  { key: "1y", label: "1 tahun", bucket: "month" },
];

function label(bucket: string, b: "day" | "week" | "month") {
  const [y, m, d] = bucket.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (b === "month") return format(date, "MMM yy", { locale: localeId });
  if (b === "week") return format(date, "d MMM", { locale: localeId });
  return format(date, "d MMM", { locale: localeId });
}

export function CashflowPanel({ initial, initialRange = "30d" }: { initial: { bucket: string; income: number; expense: number }[]; initialRange?: Range }) {
  const [range, setRange] = useState<Range>(initialRange);
  const [data, setData] = useState(initial);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const cfg = RANGES.find((r) => r.key === range)!;
  const totalIn = data.reduce((a, d) => a + d.income, 0);
  const totalOut = data.reduce((a, d) => a + d.expense, 0);

  function pick(r: Range) {
    setRange(r);
    start(async () => {
      try {
        setData(await cashflowAction(r));
        setError(false);
      } catch {
        setError(true);
      }
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base font-bold">Pemasukan vs Pengeluaran</h2>
          <p className="text-xs text-muted">Kas organisasi (tanpa akun event)</p>
        </div>
        <div role="tablist" aria-label="Rentang waktu" className="grid w-full grid-cols-4 gap-1 rounded-xl border border-border bg-bg-soft p-1 sm:flex sm:w-auto">
          {RANGES.map((r) => (
            <button
              key={r.key}
              role="tab"
              type="button"
              aria-selected={range === r.key}
              onClick={() => pick(r.key)}
              className={cn(
                "h-8 min-w-0 rounded-lg px-1 text-[11px] font-bold whitespace-nowrap transition-colors sm:px-2.5 sm:text-xs",
                range === r.key ? "bg-surface text-text shadow-soft-sm" : "text-muted hover:text-text",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-grass-100 px-3 py-2.5">
          <p className="text-[11px] font-bold tracking-wide text-grass-600 uppercase">Masuk</p>
          <p className="font-display text-lg font-extrabold text-text tabular">{rupiah(totalIn)}</p>
        </div>
        <div className="rounded-xl bg-danger-bg px-3 py-2.5">
          <p className="text-[11px] font-bold tracking-wide text-danger uppercase">Keluar</p>
          <p className="font-display text-lg font-extrabold text-text tabular">{rupiah(totalOut)}</p>
        </div>
      </div>
      <div className={cn("mt-4 transition-opacity", pending && "opacity-50")} aria-busy={pending}>
        {error ? (
          <p className="rounded-xl bg-bg-soft p-6 text-center text-sm text-muted">Data belum berhasil dimuat. Coba lagi.</p>
        ) : (
          <CashflowChart
            data={data.map((d) => ({ label: label(d.bucket, cfg.bucket), income: d.income, expense: d.expense }))}
            variant={cfg.bucket === "day" ? "area" : "bar"}
            height={240}
          />
        )}
      </div>
    </div>
  );
}
