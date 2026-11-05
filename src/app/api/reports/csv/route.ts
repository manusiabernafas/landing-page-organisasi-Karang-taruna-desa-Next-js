import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { buildReport, parseReportParams } from "@/lib/services/reports";
import { todayJakarta } from "@/lib/utils/format";

function csvCell(v: unknown) {
  if (v === null || v === undefined) return "";
  let s = String(v);
  // Cegah CSV/formula injection saat dibuka di Excel/Sheets.
  if (/^[=+\-@\t\r]/.test(s) && typeof v !== "number") s = `'${s}`;
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: NextRequest) {
  const session = await getSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (!can(session.profile.role, "reports.view")) return NextResponse.json({ error: "Laporan hanya untuk pengurus inti." }, { status: 403 });
  const today = todayJakarta();
  const params = parseReportParams(Object.fromEntries(request.nextUrl.searchParams), { from: `${today.slice(0, 4)}-01-01`, to: today });
  try {
    const report = await buildReport(session.organization.id, params);
    const lines = [
      [`${report.title} — Pemuda RW 05 Kwarasan`],
      [report.subtitle],
      [],
      report.columns.map((c) => c.label),
      ...report.rows.map((r) => report.columns.map((c) => r[c.key])),
      [],
      ...report.totals.map((t) => [t.label, t.value]),
    ];
    const body = "﻿" + lines.map((l) => l.map(csvCell).join(",")).join("\r\n");
    const name = `laporan-${params.report}-${params.from}_${params.to}.csv`;
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Laporan belum berhasil dibuat. Coba lagi." }, { status: 500 });
  }
}
