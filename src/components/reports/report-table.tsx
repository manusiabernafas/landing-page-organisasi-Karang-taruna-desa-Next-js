import { rupiah, num } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ReportResult } from "@/lib/services/reports";

function cell(v: string | number | null, money?: boolean) {
  if (v === null || v === "") return "-";
  if (typeof v === "number") return money ? rupiah(v) : num(v);
  return v;
}

export function ReportTable({ report, limit }: { report: ReportResult; limit?: number }) {
  const rows = limit ? report.rows.slice(0, limit) : report.rows;
  return (
    <div className="space-y-4">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
        {report.totals.map((t) => (
          <div key={t.label} className="rounded-2xl border border-border bg-surface p-4 print:rounded-none print:p-2">
            <dt className="text-xs font-semibold text-muted">{t.label}</dt>
            <dd className={cn("font-display text-xl font-extrabold tabular", t.money && t.value < 0 && "text-danger")}>{t.money ? rupiah(t.value) : num(t.value)}</dd>
          </div>
        ))}
      </dl>
      {rows.length === 0 ? (
        <p className="rounded-card border border-dashed border-border-strong bg-surface-2 p-8 text-center text-sm text-muted">Tidak ada data untuk filter ini.</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface print:overflow-visible print:rounded-none">
          <table className="w-full min-w-[720px] text-sm print:min-w-0 print:text-[10px]">
            <thead className="bg-bg-soft text-left text-xs font-bold tracking-wider text-muted uppercase">
              <tr>
                {report.columns.map((c) => (
                  <th key={c.key} scope="col" className={cn("px-3 py-2.5 whitespace-nowrap", c.align === "right" && "text-right")}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={i}>
                  {report.columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-3 py-2",
                        c.align === "right" && "text-right whitespace-nowrap tabular",
                        c.money && typeof r[c.key] === "number" && (r[c.key] as number) < 0 && "text-danger",
                      )}
                    >
                      {cell(r[c.key], c.money)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {limit && report.rows.length > limit ? (
        <p className="text-sm text-muted">
          Menampilkan {limit} dari {report.rows.length} baris. Export CSV atau cetak untuk data lengkap.
        </p>
      ) : null}
    </div>
  );
}
