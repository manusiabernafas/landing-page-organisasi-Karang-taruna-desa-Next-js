import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { buildReport, parseReportParams } from "@/lib/services/reports";
import { fmtDateTime, todayJakarta } from "@/lib/utils/format";
import { LogoMark } from "@/components/illustrations/logo";
import { ReportTable } from "@/components/reports/report-table";
import { PrintButton } from "@/components/inventory/qr-sheet";
import { ORG_LOCATION_FULL } from "@/lib/config";

export const metadata: Metadata = { title: "Cetak Laporan" };

export default async function PrintReportPage({ searchParams }: PageProps<"/dashboard/reports/print">) {
  const session = await requirePermission("reports.view");
  const sp = await searchParams;
  const today = todayJakarta();
  const p = parseReportParams(sp, { from: `${today.slice(0, 4)}-01-01`, to: today });
  const report = await buildReport(session.organization.id, p);
  return (
    <article className="mx-auto max-w-5xl space-y-5 bg-surface p-4 sm:p-8 print:max-w-none print:p-0">
      <div className="no-print flex justify-end">
        <PrintButton label="Cetak / Simpan PDF" />
      </div>
      <header className="flex items-center gap-4 border-b-2 border-forest pb-4">
        <LogoMark size={56} />
        <div>
          <p className="font-display text-xl font-extrabold tracking-tight">BASECAMP PEMUDA RW 05</p>
          <p className="text-sm text-muted">{ORG_LOCATION_FULL}</p>
        </div>
      </header>
      <div>
        <h1 className="font-display text-2xl font-extrabold">{report.title}</h1>
        <p className="text-sm text-muted">{report.subtitle}</p>
      </div>
      <ReportTable report={report} />
      <footer className="grid grid-cols-2 gap-8 pt-10 text-sm">
        <div>
          <p className="text-muted">Dicetak oleh</p>
          <p className="mt-14 font-semibold">{session.profile.full_name}</p>
          <p className="text-xs text-muted">{fmtDateTime(new Date())}</p>
        </div>
        <div className="text-right">
          <p className="text-muted">Mengetahui, Ketua Pemuda RW 05</p>
          <p className="mt-14 font-semibold">(........................................)</p>
        </div>
      </footer>
    </article>
  );
}
