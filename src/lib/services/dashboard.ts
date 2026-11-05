import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ORG_SLUG } from "@/lib/config";
import { toNumber } from "@/lib/utils/format";
import type { Session } from "@/lib/auth";
import type { AuditLog, EventRow, OrgMetrics } from "@/types/db";

export type CashRange = "7d" | "30d" | "3m" | "1y";
export const CASH_RANGES: Record<CashRange, { days: number; bucket: "day" | "week" | "month"; label: string }> = {
  "7d": { days: 7, bucket: "day", label: "7 hari" },
  "30d": { days: 30, bucket: "day", label: "30 hari" },
  "3m": { days: 91, bucket: "week", label: "3 bulan" },
  "1y": { days: 365, bucket: "month", label: "1 tahun" },
};

export async function getCashflowSeries(range: CashRange) {
  const supabase = await createClient();
  const cfg = CASH_RANGES[range];
  const { data, error } = await supabase.rpc("org_cashflow", { p_days: cfg.days, p_bucket: cfg.bucket });
  if (error) throw new Error(error.message);
  return ((data ?? []) as { bucket: string; income: number; expense: number }[]).map((r) => ({
    bucket: r.bucket,
    income: toNumber(r.income),
    expense: toNumber(r.expense),
  }));
}

export async function getDashboardOverview(session: Session) {
  const supabase = await createClient();
  const orgId = session.organization.id;
  // Notifikasi terjadwal & achievement diperbarui ringan setiap dashboard dibuka.
  await Promise.all([supabase.rpc("refresh_notifications"), supabase.rpc("refresh_achievements", { p_org: orgId })]);

  const nowIso = new Date().toISOString();
  const [stats, finance, upcoming, units, members, pendingBorrow, dueBorrow, pendingTx, maint, audit, achievements] = await Promise.all([
    supabase.rpc("public_stats", { p_slug: ORG_SLUG }),
    supabase.rpc("public_finance_summary", { p_slug: ORG_SLUG }),
    supabase
      .from("events")
      .select("id,name,slug,kind,status,start_date,end_date,location,budget,target_participant")
      .eq("organization_id", orgId)
      .in("status", ["PLANNING", "READY", "ONGOING"])
      .gte("end_date", nowIso)
      .order("start_date")
      .limit(4),
    supabase.from("inventory_units").select("status").eq("organization_id", orgId),
    supabase.from("members").select("id,name,photo").eq("organization_id", orgId).eq("status", "ACTIVE").order("join_date").limit(5),
    supabase.from("borrowings").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "REQUESTED"),
    supabase
      .from("borrowings")
      .select("id,borrowing_code,borrower_name,expected_return_date")
      .eq("organization_id", orgId)
      .eq("status", "BORROWED")
      .order("expected_return_date")
      .limit(4),
    supabase.from("finance_transactions").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("is_approved", false),
    supabase.from("inventory_maintenance").select("id", { count: "exact", head: true }).eq("organization_id", orgId).neq("status", "DONE"),
    supabase.from("audit_logs").select("id,actor_name,action,entity,entity_id,summary,metadata,created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(7),
    supabase
      .from("organization_achievements")
      .select("progress,unlocked_at,achievements(code,name,description,threshold,icon,tier,sort_order)")
      .eq("organization_id", orgId),
  ]);

  if (stats.error) throw new Error(stats.error.message);

  const events = (upcoming.data ?? []) as Pick<EventRow, "id" | "name" | "slug" | "kind" | "status" | "start_date" | "end_date" | "location" | "budget" | "target_participant">[];
  const ids = events.map((e) => e.id);
  const [tasks, fin] = ids.length
    ? await Promise.all([
        supabase.from("event_tasks").select("event_id,is_done").in("event_id", ids),
        supabase.from("event_finance_summary").select("event_id,expense,budget_used_pct").in("event_id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const taskMap = new Map<string, { total: number; done: number }>();
  for (const t of (tasks.data ?? []) as { event_id: string; is_done: boolean }[]) {
    const cur = taskMap.get(t.event_id) ?? { total: 0, done: 0 };
    cur.total++;
    if (t.is_done) cur.done++;
    taskMap.set(t.event_id, cur);
  }
  const finMap = new Map(((fin.data ?? []) as { event_id: string; expense: number; budget_used_pct: number }[]).map((f) => [f.event_id, f]));

  const unitCounts = { total: 0, AVAILABLE: 0, BORROWED: 0, MAINTENANCE: 0, DAMAGED: 0, LOST: 0 } as Record<string, number>;
  for (const u of (units.data ?? []) as { status: string }[]) {
    unitCounts[u.status] = (unitCounts[u.status] ?? 0) + 1;
    if (u.status !== "LOST") unitCounts.total++;
  }

  const s = stats.data as { members_active: number; events_active: number; inventory_units: number; metrics: OrgMetrics };
  const f = finance.data as { balance: number; income_month: number; expense_month: number } | null;

  type AchRow = { progress: number; unlocked_at: string | null; achievements: { code: string; name: string; description: string; threshold: number; icon: string; tier: string; sort_order: number } | null };
  const ach = ((achievements.data ?? []) as unknown as AchRow[])
    .filter((a) => a.achievements)
    .map((a) => ({ ...a.achievements!, progress: a.progress, unlocked_at: a.unlocked_at }));

  return {
    metrics: s.metrics,
    membersActive: s.members_active,
    eventsActive: s.events_active,
    finance: {
      balance: toNumber(f?.balance),
      incomeMonth: toNumber(f?.income_month),
      expenseMonth: toNumber(f?.expense_month),
    },
    units: unitCounts,
    memberPreview: (members.data ?? []) as { id: string; name: string; photo: string | null }[],
    upcoming: events.map((e) => {
      const t = taskMap.get(e.id) ?? { total: 0, done: 0 };
      const fi = finMap.get(e.id);
      return {
        ...e,
        budget: toNumber(e.budget),
        questTotal: t.total,
        questDone: t.done,
        expense: toNumber(fi?.expense),
        budgetUsed: toNumber(fi?.budget_used_pct),
      };
    }),
    attention: {
      pendingBorrowings: pendingBorrow.count ?? 0,
      pendingTransactions: pendingTx.count ?? 0,
      openMaintenance: maint.count ?? 0,
      dueBorrowings: (dueBorrow.data ?? []) as { id: string; borrowing_code: string; borrower_name: string; expected_return_date: string }[],
    },
    audit: (audit.data ?? []) as AuditLog[],
    achievements: ach,
  };
}
