"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { rupiah } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const FALLBACK = ["#3e9b4f", "#3d95cf", "#f2b632", "#8b5e3c", "#e07a5f", "#7bc47f", "#6b7280"];

export function CategoryDonut({ data }: { data: { category: string; type: string; color: string | null; total: number }[] }) {
  const [type, setType] = useState<"EXPENSE" | "INCOME">(data.some((d) => d.type === "EXPENSE") ? "EXPENSE" : "INCOME");
  const rows = data.filter((d) => d.type === type);
  const total = rows.reduce((a, d) => a + d.total, 0);
  return (
    <div>
      <div role="tablist" aria-label="Jenis" className="mb-3 inline-flex rounded-xl border border-border bg-bg-soft p-1">
        {(["EXPENSE", "INCOME"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={type === t}
            onClick={() => setType(t)}
            className={cn("h-8 rounded-lg px-3 text-xs font-bold", type === t ? "bg-surface shadow-soft-sm" : "text-muted")}
          >
            {t === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Belum ada data.</p>
      ) : (
        <div className="grid items-center gap-4 sm:grid-cols-[160px_1fr] xl:grid-cols-1 2xl:grid-cols-[160px_1fr]">
          <div className="relative mx-auto size-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={rows} dataKey="total" nameKey="category" innerRadius={50} outerRadius={76} paddingAngle={2} stroke="var(--surface)" strokeWidth={2}>
                  {rows.map((r, i) => (
                    <Cell key={r.category} fill={r.color ?? FALLBACK[i % FALLBACK.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => rupiah(Number(v))} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-muted uppercase">Total</span>
              <span className="text-sm font-extrabold tabular">{rupiah(total).replace("Rp ", "")}</span>
            </div>
          </div>
          <ul className="space-y-1.5">
            {rows.map((r, i) => (
              <li key={r.category} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-sm" style={{ background: r.color ?? FALLBACK[i % FALLBACK.length] }} aria-hidden />
                  <span className="truncate">{r.category}</span>
                </span>
                <span className="font-semibold tabular">{Math.round((r.total / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
