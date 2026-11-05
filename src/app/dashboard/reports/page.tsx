import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileBarChart, Printer } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildReport, parseReportParams, reportQuery, REPORTS } from "@/lib/services/reports";
import { todayJakarta } from "@/lib/utils/format";
import { BORROWING_STATUS, EVENT_STATUS, MAINTENANCE_STATUS } from "@/lib/utils/labels";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/states";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ReportTable } from "@/components/reports/report-table";

export const metadata: Metadata = { title: "Laporan" };

export default async function ReportsPage({ searchParams }: PageProps<"/dashboard/reports">) {
  const session = await requirePermission("reports.view");
  const sp = await searchParams;
  const today = todayJakarta();
  const p = parseReportParams(sp, { from: `${today.slice(0, 4)}-01-01`, to: today });
  const supabase = await createClient();
  const [report, events, fcats, icats] = await Promise.all([
    buildReport(session.organization.id, p),
    supabase.from("events").select("id,name").eq("organization_id", session.organization.id).order("start_date", { ascending: false }),
    supabase.from("finance_categories").select("id,name,type").eq("organization_id", session.organization.id).order("name"),
    supabase.from("inventory_categories").select("id,name").eq("organization_id", session.organization.id).order("name"),
  ]);
  const qs = reportQuery(p);
  const isFinance = ["kas", "pemasukan", "pengeluaran"].includes(p.report);
  const statusOptions: [string, string][] =
    p.report === "event"
      ? Object.entries(EVENT_STATUS).map(([k, v]) => [k, v.label])
      : p.report === "peminjaman"
        ? Object.entries(BORROWING_STATUS).map(([k, v]) => [k, v.label])
        : p.report === "maintenance"
          ? Object.entries(MAINTENANCE_STATUS).map(([k, v]) => [k, v.label])
          : isFinance
            ? [["PENDING", "Belum disetujui"]]
            : [];
  const categories =
    p.report === "inventaris"
      ? ((icats.data ?? []) as { id: string; name: string }[])
      : isFinance
        ? ((fcats.data ?? []) as { id: string; name: string; type: string }[]).filter((c) => p.report === "kas" || (p.report === "pemasukan" ? c.type === "INCOME" : c.type === "EXPENSE"))
        : [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Laporan"
        title="Laporan basecamp"
        description="Pilih jenis laporan dan filter, lalu export CSV atau cetak/simpan sebagai PDF untuk rapat dan pertanggungjawaban."
        icon={
          <ResourceIcon tone="sky" size="lg">
            <FileBarChart />
          </ResourceIcon>
        }
      />
      <form method="get" className="grid gap-3 rounded-card border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
        <label className="lg:col-span-2">
          <span className="mb-1.5 block text-sm font-semibold">Jenis laporan</span>
          <Select name="report" defaultValue={p.report}>
            {Object.entries(REPORTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-semibold">Dari</span>
          <Input type="date" name="from" defaultValue={p.from} />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-semibold">Sampai</span>
          <Input type="date" name="to" defaultValue={p.to} />
        </label>
        {p.report !== "inventaris" && p.report !== "maintenance" ? (
          <label>
            <span className="mb-1.5 block text-sm font-semibold">Event</span>
            <Select name="event" defaultValue={p.event ?? ""}>
              <option value="">Semua</option>
              {((events.data ?? []) as { id: string; name: string }[]).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </label>
        ) : null}
        {categories.length ? (
          <label>
            <span className="mb-1.5 block text-sm font-semibold">Kategori</span>
            <Select name="category" defaultValue={p.category ?? ""}>
              <option value="">Semua</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
        ) : null}
        {statusOptions.length ? (
          <label>
            <span className="mb-1.5 block text-sm font-semibold">Status</span>
            <Select name="status" defaultValue={p.status ?? ""}>
              <option value="">{isFinance ? "Disetujui" : "Semua"}</option>
              {statusOptions.map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </label>
        ) : null}
        <Button type="submit" className="lg:col-start-6">
          Terapkan
        </Button>
      </form>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">{report.title}</h2>
          <p className="text-sm text-muted">{report.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/reports/csv?${qs}`} className={buttonClass("secondary", "md")}>
            <Download /> Export CSV
          </a>
          <Link href={`/dashboard/reports/print?${qs}`} target="_blank" className={buttonClass("primary", "md")}>
            <Printer /> Cetak / PDF
          </Link>
        </div>
      </div>
      <ReportTable report={report} limit={100} />
    </div>
  );
}
