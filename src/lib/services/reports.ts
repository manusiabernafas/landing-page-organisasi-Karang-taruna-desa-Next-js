import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toNumber } from "@/lib/utils/format";
import { BORROWING_STATUS, CONDITION, EVENT_STATUS, FINANCE_TYPE, ITEM_STATUS, MAINTENANCE_STATUS, PAYMENT_METHOD } from "@/lib/utils/labels";

export const REPORTS = {
  kas: "Laporan kas (semua transaksi)",
  pemasukan: "Laporan pemasukan",
  pengeluaran: "Laporan pengeluaran",
  event: "Laporan event",
  inventaris: "Laporan inventaris",
  peminjaman: "Laporan peminjaman",
  maintenance: "Laporan maintenance",
} as const;
export type ReportKey = keyof typeof REPORTS;

export interface ReportParams {
  report: ReportKey;
  from: string;
  to: string;
  event?: string;
  category?: string;
  status?: string;
}

export interface ReportColumn {
  key: string;
  label: string;
  align?: "right";
  money?: boolean;
}

export interface ReportResult {
  title: string;
  subtitle: string;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  totals: { label: string; value: number; money?: boolean }[];
}

const uuid = (v?: string) => (v && /^[0-9a-f-]{36}$/.test(v) ? v : undefined);

export function parseReportParams(sp: Record<string, string | string[] | undefined>, fallback: { from: string; to: string }): ReportParams {
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const report = (Object.keys(REPORTS).includes(s("report") ?? "") ? s("report") : "kas") as ReportKey;
  const date = (v: string | undefined, d: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : d);
  let from = date(s("from"), fallback.from);
  let to = date(s("to"), fallback.to);
  if (to < from) [from, to] = [to, from];
  return { report, from, to, event: uuid(s("event")), category: uuid(s("category")), status: s("status")?.replace(/[^A-Z_]/g, "") || undefined };
}

export async function buildReport(orgId: string, p: ReportParams): Promise<ReportResult> {
  const supabase = await createClient();
  const period = `${p.from} s/d ${p.to}`;

  if (p.report === "kas" || p.report === "pemasukan" || p.report === "pengeluaran") {
    let q = supabase
      .from("finance_transactions")
      .select(
        "transaction_code,transaction_date,type,amount,description,payment_method,is_approved,is_public, category:finance_categories(name), account:finance_accounts!finance_transactions_account_id_fkey(name), to_account:finance_accounts!finance_transactions_to_account_id_fkey(name), event:events(name)",
      )
      .eq("organization_id", orgId)
      .order("transaction_date")
      .order("created_at");
    // Laporan per event mencakup seluruh transaksi event tanpa batas periode.
    if (!p.event) q = q.gte("transaction_date", p.from).lte("transaction_date", p.to);
    if (p.report === "pemasukan") q = q.eq("type", "INCOME");
    if (p.report === "pengeluaran") q = q.eq("type", "EXPENSE");
    if (p.event) q = q.eq("event_id", p.event);
    if (p.category) q = q.eq("category_id", p.category);
    if (p.status === "PENDING") q = q.eq("is_approved", false);
    else q = q.eq("is_approved", true);
    const { data, error } = await q.limit(5000);
    if (error) throw new Error(error.message);
    type R = { transaction_code: string; transaction_date: string; type: keyof typeof FINANCE_TYPE; amount: number; description: string | null; payment_method: keyof typeof PAYMENT_METHOD; is_public: boolean; category: { name: string } | null; account: { name: string } | null; to_account: { name: string } | null; event: { name: string } | null };
    const rows = (data ?? []) as unknown as R[];
    const income = rows.filter((r) => r.type === "INCOME").reduce((a, r) => a + toNumber(r.amount), 0);
    const expense = rows.filter((r) => r.type === "EXPENSE").reduce((a, r) => a + toNumber(r.amount), 0);
    return {
      title: REPORTS[p.report],
      subtitle: `${p.event ? "Seluruh transaksi event" : `Periode ${period}`}${p.status === "PENDING" ? " · transaksi belum disetujui" : " · transaksi disetujui"}`,
      columns: [
        { key: "tanggal", label: "Tanggal" },
        { key: "kode", label: "Kode" },
        { key: "jenis", label: "Jenis" },
        { key: "kategori", label: "Kategori" },
        { key: "keterangan", label: "Keterangan" },
        { key: "akun", label: "Akun" },
        { key: "event", label: "Event" },
        { key: "metode", label: "Metode" },
        { key: "nominal", label: "Nominal", align: "right", money: true },
      ],
      rows: rows.map((r) => ({
        tanggal: r.transaction_date,
        kode: r.transaction_code,
        jenis: FINANCE_TYPE[r.type].label,
        kategori: r.category?.name ?? (r.type === "TRANSFER" ? "Transfer" : "-"),
        keterangan: r.description ?? "",
        akun: r.type === "TRANSFER" ? `${r.account?.name} → ${r.to_account?.name}` : r.account?.name ?? "",
        event: r.event?.name ?? "",
        metode: PAYMENT_METHOD[r.payment_method],
        nominal: r.type === "EXPENSE" ? -toNumber(r.amount) : toNumber(r.amount),
      })),
      totals: [
        ...(p.report !== "pengeluaran" ? [{ label: "Total pemasukan", value: income, money: true }] : []),
        ...(p.report !== "pemasukan" ? [{ label: "Total pengeluaran", value: expense, money: true }] : []),
        ...(p.report === "kas" ? [{ label: "Selisih periode", value: income - expense, money: true }] : []),
        { label: "Jumlah transaksi", value: rows.length },
      ],
    };
  }

  if (p.report === "event") {
    let q = supabase.from("events").select("id,name,kind,status,start_date,location,budget,target_participant,actual_participant").eq("organization_id", orgId).order("start_date");
    if (p.event) q = q.eq("id", p.event);
    else q = q.gte("start_date", `${p.from}T00:00:00+07:00`).lte("start_date", `${p.to}T23:59:59+07:00`);
    if (p.status && p.status in EVENT_STATUS) q = q.eq("status", p.status);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const evs = (data ?? []) as { id: string; name: string; kind: string; status: keyof typeof EVENT_STATUS; start_date: string; location: string | null; budget: number; target_participant: number | null; actual_participant: number | null }[];
    const ids = evs.map((e) => e.id);
    const [fin, tasks] = ids.length
      ? await Promise.all([
          supabase.from("event_finance_summary").select("event_id,income,expense,remaining_budget").in("event_id", ids),
          supabase.from("event_tasks").select("event_id,is_done").in("event_id", ids),
        ])
      : [{ data: [] }, { data: [] }];
    const fm = new Map(((fin.data ?? []) as { event_id: string; income: number; expense: number; remaining_budget: number }[]).map((f) => [f.event_id, f]));
    const tm = new Map<string, { t: number; d: number }>();
    for (const t of (tasks.data ?? []) as { event_id: string; is_done: boolean }[]) {
      const x = tm.get(t.event_id) ?? { t: 0, d: 0 };
      x.t++;
      if (t.is_done) x.d++;
      tm.set(t.event_id, x);
    }
    const rows = evs.map((e) => ({
      tanggal: e.start_date.slice(0, 10),
      event: e.name,
      jenis: e.kind === "EVENT" ? "Event" : "Kegiatan",
      status: EVENT_STATUS[e.status].label,
      peserta: `${e.actual_participant ?? "-"} / ${e.target_participant ?? "-"}`,
      quest: tm.get(e.id) ? `${tm.get(e.id)!.d}/${tm.get(e.id)!.t}` : "0/0",
      budget: toNumber(e.budget),
      pemasukan: toNumber(fm.get(e.id)?.income),
      pengeluaran: toNumber(fm.get(e.id)?.expense),
      sisa_budget: toNumber(fm.get(e.id)?.remaining_budget ?? e.budget),
    }));
    return {
      title: REPORTS.event,
      subtitle: `Periode ${period}`,
      columns: [
        { key: "tanggal", label: "Tanggal" },
        { key: "event", label: "Event" },
        { key: "jenis", label: "Jenis" },
        { key: "status", label: "Status" },
        { key: "peserta", label: "Peserta (hadir/target)" },
        { key: "quest", label: "Quest" },
        { key: "budget", label: "Budget", align: "right", money: true },
        { key: "pemasukan", label: "Pemasukan", align: "right", money: true },
        { key: "pengeluaran", label: "Actual", align: "right", money: true },
        { key: "sisa_budget", label: "Sisa budget", align: "right", money: true },
      ],
      rows,
      totals: [
        { label: "Jumlah event/kegiatan", value: rows.length },
        { label: "Total budget", value: rows.reduce((a, r) => a + r.budget, 0), money: true },
        { label: "Total actual", value: rows.reduce((a, r) => a + r.pengeluaran, 0), money: true },
      ],
    };
  }

  if (p.report === "inventaris") {
    let q = supabase.from("inventory_items").select("asset_code,unit_prefix,name,unit_label,location,status,total_quantity,available_quantity,purchase_price,category:inventory_categories(name)").eq("organization_id", orgId).eq("is_archived", false).order("asset_code");
    if (p.category) q = q.eq("category_id", p.category);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    type I = { asset_code: string; unit_prefix: string; name: string; unit_label: string; location: string | null; status: keyof typeof ITEM_STATUS; total_quantity: number; available_quantity: number; purchase_price: number | null; category: { name: string } | null };
    const items = (data ?? []) as unknown as I[];
    return {
      title: REPORTS.inventaris,
      subtitle: `Posisi stok per ${p.to}`,
      columns: [
        { key: "kode", label: "Kode aset" },
        { key: "barang", label: "Barang" },
        { key: "kategori", label: "Kategori" },
        { key: "total", label: "Total unit", align: "right" },
        { key: "tersedia", label: "Tersedia", align: "right" },
        { key: "status", label: "Status" },
        { key: "lokasi", label: "Lokasi" },
        { key: "nilai", label: "Nilai aset", align: "right", money: true },
      ],
      rows: items.map((i) => ({
        kode: `${i.asset_code} (${i.unit_prefix})`,
        barang: i.name,
        kategori: i.category?.name ?? "",
        total: i.total_quantity,
        tersedia: i.available_quantity,
        status: ITEM_STATUS[i.status].label,
        lokasi: i.location ?? "",
        nilai: toNumber(i.purchase_price) * i.total_quantity,
      })),
      totals: [
        { label: "Jenis barang", value: items.length },
        { label: "Total unit", value: items.reduce((a, i) => a + i.total_quantity, 0) },
        { label: "Unit tersedia", value: items.reduce((a, i) => a + i.available_quantity, 0) },
      ],
    };
  }

  if (p.report === "peminjaman") {
    let q = supabase.from("borrowings").select("borrowing_code,borrower_name,purpose,borrow_date,expected_return_date,actual_return_date,status, event:events(name), items:borrowing_items(id)").eq("organization_id", orgId).gte("borrow_date", p.from).lte("borrow_date", p.to).order("borrow_date");
    if (p.event) q = q.eq("event_id", p.event);
    if (p.status && p.status in BORROWING_STATUS) q = q.eq("status", p.status);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    type B = { borrowing_code: string; borrower_name: string; purpose: string; borrow_date: string; expected_return_date: string; actual_return_date: string | null; status: keyof typeof BORROWING_STATUS; event: { name: string } | null; items: { id: string }[] };
    const rows = (data ?? []) as unknown as B[];
    return {
      title: REPORTS.peminjaman,
      subtitle: `Periode ${period}`,
      columns: [
        { key: "kode", label: "Kode" },
        { key: "peminjam", label: "Peminjam" },
        { key: "keperluan", label: "Keperluan" },
        { key: "event", label: "Event" },
        { key: "pinjam", label: "Pinjam" },
        { key: "rencana", label: "Rencana kembali" },
        { key: "kembali", label: "Dikembalikan" },
        { key: "unit", label: "Unit", align: "right" },
        { key: "status", label: "Status" },
      ],
      rows: rows.map((b) => ({
        kode: b.borrowing_code,
        peminjam: b.borrower_name,
        keperluan: b.purpose,
        event: b.event?.name ?? "",
        pinjam: b.borrow_date,
        rencana: b.expected_return_date,
        kembali: b.actual_return_date ?? "",
        unit: b.items.length,
        status: BORROWING_STATUS[b.status].label,
      })),
      totals: [
        { label: "Jumlah peminjaman", value: rows.length },
        { label: "Total unit dipinjam", value: rows.reduce((a, b) => a + b.items.length, 0) },
        { label: "Terlambat kembali", value: rows.filter((b) => b.actual_return_date && b.actual_return_date > b.expected_return_date).length },
      ],
    };
  }

  // maintenance
  let q = supabase
    .from("inventory_maintenance")
    .select("issue,status,cost,started_at,completed_at,result_condition,notes, unit:inventory_units(unit_code, item:inventory_items(name))")
    .eq("organization_id", orgId)
    .gte("started_at", `${p.from}T00:00:00+07:00`)
    .lte("started_at", `${p.to}T23:59:59+07:00`)
    .order("started_at");
  if (p.status && p.status in MAINTENANCE_STATUS) q = q.eq("status", p.status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  type M = { issue: string; status: keyof typeof MAINTENANCE_STATUS; cost: number | null; started_at: string; completed_at: string | null; result_condition: keyof typeof CONDITION | null; notes: string | null; unit: { unit_code: string; item: { name: string } | null } | null };
  const rows = (data ?? []) as unknown as M[];
  return {
    title: REPORTS.maintenance,
    subtitle: `Periode ${period}`,
    columns: [
      { key: "mulai", label: "Mulai" },
      { key: "unit", label: "Unit" },
      { key: "barang", label: "Barang" },
      { key: "masalah", label: "Masalah" },
      { key: "status", label: "Status" },
      { key: "selesai", label: "Selesai" },
      { key: "hasil", label: "Hasil" },
      { key: "biaya", label: "Biaya", align: "right", money: true },
    ],
    rows: rows.map((m) => ({
      mulai: m.started_at.slice(0, 10),
      unit: m.unit?.unit_code ?? "",
      barang: m.unit?.item?.name ?? "",
      masalah: m.issue,
      status: MAINTENANCE_STATUS[m.status].label,
      selesai: m.completed_at?.slice(0, 10) ?? "",
      hasil: m.result_condition ? CONDITION[m.result_condition].label : "",
      biaya: toNumber(m.cost),
    })),
    totals: [
      { label: "Jumlah maintenance", value: rows.length },
      { label: "Total biaya", value: rows.reduce((a, m) => a + toNumber(m.cost), 0), money: true },
    ],
  };
}

export function reportQuery(p: ReportParams) {
  const u = new URLSearchParams({ report: p.report, from: p.from, to: p.to });
  if (p.event) u.set("event", p.event);
  if (p.category) u.set("category", p.category);
  if (p.status) u.set("status", p.status);
  return u.toString();
}
