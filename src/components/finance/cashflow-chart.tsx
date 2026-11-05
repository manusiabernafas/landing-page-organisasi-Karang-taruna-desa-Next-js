"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { rupiah, rupiahShort } from "@/lib/utils/format";

export interface CashflowPoint {
  label: string;
  income: number;
  expense: number;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const income = payload.find((p) => p.dataKey === "income")?.value ?? 0;
  const expense = payload.find((p) => p.dataKey === "expense")?.value ?? 0;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5 text-xs shadow-soft-lg">
      <p className="mb-1.5 font-bold text-text">{label}</p>
      <p className="flex items-center justify-between gap-4 text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[var(--chart-income)]" /> Pemasukan
        </span>
        <span className="font-semibold text-text tabular">{rupiah(income)}</span>
      </p>
      <p className="mt-1 flex items-center justify-between gap-4 text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[var(--chart-expense)]" /> Pengeluaran
        </span>
        <span className="font-semibold text-text tabular">{rupiah(expense)}</span>
      </p>
      <p className="mt-1.5 border-t border-border pt-1.5 text-muted">
        Selisih <span className="font-semibold text-text tabular">{rupiah(income - expense)}</span>
      </p>
    </div>
  );
}

export function CashflowChart({
  data,
  variant = "bar",
  height = 260,
  ariaLabel = "Grafik pemasukan dan pengeluaran",
}: {
  data: CashflowPoint[];
  variant?: "bar" | "area";
  height?: number;
  ariaLabel?: string;
}) {
  const totalIn = data.reduce((a, d) => a + d.income, 0);
  const totalOut = data.reduce((a, d) => a + d.expense, 0);
  const common = {
    data,
    margin: { top: 8, right: 4, left: 0, bottom: 0 },
  };
  const axis = {
    tick: { fill: "var(--text-subtle)", fontSize: 11 },
    axisLine: false,
    tickLine: false,
  } as const;
  return (
    <figure aria-label={ariaLabel}>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[var(--chart-income)]" aria-hidden /> Pemasukan
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[var(--chart-expense)]" aria-hidden /> Pengeluaran
        </span>
      </div>
      <div style={{ height }} className="-ml-2">
        <ResponsiveContainer width="100%" height="100%">
          {variant === "bar" ? (
            <BarChart {...common} barGap={3} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 4" />
              <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={8} />
              <YAxis {...axis} width={58} tickFormatter={(v) => rupiahShort(v).replace("Rp ", "")} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--bg-soft)" }} />
              <Bar dataKey="income" fill="var(--chart-income)" radius={[6, 6, 2, 2]} maxBarSize={28} />
              <Bar dataKey="expense" fill="var(--chart-expense)" radius={[6, 6, 2, 2]} maxBarSize={28} />
            </BarChart>
          ) : (
            <AreaChart {...common}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 4" />
              <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={16} />
              <YAxis {...axis} width={58} tickFormatter={(v) => rupiahShort(v).replace("Rp ", "")} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border-strong)" }} />
              <Area type="monotone" dataKey="income" stroke="var(--chart-income)" strokeWidth={2.5} fill="var(--chart-income)" fillOpacity={0.12} />
              <Area type="monotone" dataKey="expense" stroke="var(--chart-expense)" strokeWidth={2.5} fill="var(--chart-expense)" fillOpacity={0.1} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        Total pemasukan {rupiah(totalIn)} dan pengeluaran {rupiah(totalOut)} pada periode ini.
      </figcaption>
    </figure>
  );
}
