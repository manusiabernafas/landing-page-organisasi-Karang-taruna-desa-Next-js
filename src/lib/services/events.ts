import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mediaUrl, signedUrls } from "./storage";
import { toNumber } from "@/lib/utils/format";
import type { Borrowing, DocumentRow, EventFinanceSummary, EventMember, EventRow, EventSchedule, EventTask, Member } from "@/types/db";

export type EventFilter = "all" | "upcoming" | "ongoing" | "completed";

export async function listEvents(orgId: string, opts: { filter: EventFilter; q?: string; page: number; pageSize: number }) {
  const supabase = await createClient();
  let q = supabase.from("events").select("*", { count: "exact" }).eq("organization_id", orgId);
  const now = new Date().toISOString();
  if (opts.filter === "upcoming") q = q.in("status", ["DRAFT", "PLANNING", "READY"]).gte("end_date", now).order("start_date", { ascending: true });
  else if (opts.filter === "ongoing") q = q.eq("status", "ONGOING").order("start_date", { ascending: true });
  else if (opts.filter === "completed") q = q.in("status", ["COMPLETED", "CANCELLED"]).order("start_date", { ascending: false });
  else q = q.order("start_date", { ascending: false });
  if (opts.q) {
    const term = opts.q.replace(/[%,()*]/g, " ").trim();
    if (term) q = q.or(`name.ilike.%${term}%,location.ilike.%${term}%`);
  }
  const from = (opts.page - 1) * opts.pageSize;
  const { data, error, count } = await q.range(from, from + opts.pageSize - 1);
  if (error) throw new Error(error.message);
  const events = ((data ?? []) as EventRow[]).map((e) => ({ ...e, budget: toNumber(e.budget), coverUrl: mediaUrl(e.cover) }));
  const ids = events.map((e) => e.id);
  const { data: tasks } = ids.length ? await supabase.from("event_tasks").select("event_id,is_done").in("event_id", ids) : { data: [] };
  const progress = new Map<string, { total: number; done: number }>();
  for (const t of (tasks ?? []) as { event_id: string; is_done: boolean }[]) {
    const p = progress.get(t.event_id) ?? { total: 0, done: 0 };
    p.total++;
    if (t.is_done) p.done++;
    progress.set(t.event_id, p);
  }
  return { total: count ?? 0, items: events.map((e) => ({ ...e, progress: progress.get(e.id) ?? { total: 0, done: 0 } })) };
}

export async function listEventsInRange(orgId: string, from: string, to: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id,name,kind,status,start_date,end_date,location")
    .eq("organization_id", orgId)
    .lte("start_date", to)
    .gte("end_date", from)
    .order("start_date");
  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<EventRow, "id" | "name" | "kind" | "status" | "start_date" | "end_date" | "location">[];
}

export async function getEventDetail(id: string) {
  const supabase = await createClient();
  const { data: event, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle<EventRow>();
  if (error) throw new Error(error.message);
  if (!event) return null;
  const [tasks, schedules, committee, finance, borrowings, documents, creator] = await Promise.all([
    supabase.from("event_tasks").select("*").eq("event_id", id).order("sort_order").order("created_at"),
    supabase.from("event_schedules").select("*").eq("event_id", id).order("start_at"),
    supabase.from("event_members").select("*, member:members(id,name,nickname,photo,role)").eq("event_id", id).order("created_at"),
    supabase.from("event_finance_summary").select("*").eq("event_id", id).maybeSingle(),
    supabase
      .from("borrowings")
      .select("*, items:borrowing_items(id, unit:inventory_units(unit_code, item:inventory_items(name)))")
      .eq("event_id", id)
      .order("borrow_date", { ascending: false }),
    supabase.from("documents").select("*").eq("event_id", id).order("created_at", { ascending: false }),
    event.created_by ? supabase.from("profiles").select("full_name").eq("id", event.created_by).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const docs = (documents.data ?? []) as DocumentRow[];
  const urls = await signedUrls(supabase, "documentation", docs.map((d) => d.file_path));
  const fin = finance.data as EventFinanceSummary | null;
  type CommitteeRow = EventMember & { member: Pick<Member, "id" | "name" | "nickname" | "photo" | "role"> | null };
  type BorrowRow = Borrowing & { items: { id: string; unit: { unit_code: string; item: { name: string } | null } | null }[] };
  return {
    event: { ...event, budget: toNumber(event.budget), coverUrl: mediaUrl(event.cover) },
    creatorName: (creator.data as { full_name: string } | null)?.full_name ?? null,
    tasks: (tasks.data ?? []) as EventTask[],
    schedules: (schedules.data ?? []) as EventSchedule[],
    committee: (committee.data ?? []) as CommitteeRow[],
    finance: fin
      ? {
          accountId: fin.account_id,
          budget: toNumber(fin.budget),
          income: toNumber(fin.income),
          expense: toNumber(fin.expense),
          transferIn: toNumber(fin.transfer_in),
          transferOut: toNumber(fin.transfer_out),
          balance: toNumber(fin.balance),
          remaining: toNumber(fin.remaining_budget),
          usedPct: toNumber(fin.budget_used_pct),
        }
      : null,
    borrowings: (borrowings.data ?? []) as BorrowRow[],
    documents: docs.map((d) => ({ ...d, url: urls[d.file_path] ?? null })),
  };
}

export async function getActiveMembers(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("members").select("id,name,nickname,role").eq("organization_id", orgId).eq("status", "ACTIVE").order("name");
  return (data ?? []) as Pick<Member, "id" | "name" | "nickname" | "role">[];
}
