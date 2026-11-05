import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { ORG_SLUG, isSupabaseConfigured } from "@/lib/config";
import { mediaUrl, signedUrls } from "./storage";
import { toNumber } from "@/lib/utils/format";
import type { Achievement, DocumentRow, EventRow, EventSchedule, Organization, OrgAchievement, OrgMetrics } from "@/types/db";

export type Loaded<T> = { data: T; error: null } | { data: null; error: string };

async function load<T>(fn: () => Promise<T>): Promise<Loaded<T>> {
  if (!isSupabaseConfigured()) return { data: null, error: "not-configured" };
  try {
    return { data: await fn(), error: null };
  } catch (e) {
    console.error("[public]", e instanceof Error ? e.message : e);
    return { data: null, error: "load-failed" };
  }
}

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const getOrganization = cache(() =>
  load(async () => {
    const supabase = await createClient();
    return must(
      await supabase.from("organizations").select("id,name,slug,short_name,location,tagline,about,logo,settings").eq("slug", ORG_SLUG).maybeSingle<Organization>(),
    );
  }),
);

export interface PublicStats {
  members_active: number;
  activities_this_year: number;
  events_this_year: number;
  events_active: number;
  inventory_units: number;
  inventory_items: number;
  documents_public: number;
  metrics: OrgMetrics;
}

export const getPublicStats = cache(() =>
  load(async () => {
    const supabase = await createClient();
    return must(await supabase.rpc("public_stats", { p_slug: ORG_SLUG })) as PublicStats;
  }),
);

export interface FinanceSummary {
  balance: number;
  income_month: number;
  expense_month: number;
  events_active: number;
  updated_at: string | null;
}

export const getFinanceSummary = cache(() =>
  load(async () => {
    const supabase = await createClient();
    const raw = must(await supabase.rpc("public_finance_summary", { p_slug: ORG_SLUG })) as FinanceSummary;
    return {
      ...raw,
      balance: toNumber(raw.balance),
      income_month: toNumber(raw.income_month),
      expense_month: toNumber(raw.expense_month),
    };
  }),
);

export const getCashflow = cache((months: number) =>
  load(async () => {
    const supabase = await createClient();
    const rows = must(await supabase.rpc("public_cashflow", { p_slug: ORG_SLUG, p_months: months })) as {
      month: string;
      income: number;
      expense: number;
    }[];
    return rows.map((r) => ({ month: r.month, income: toNumber(r.income), expense: toNumber(r.expense) }));
  }),
);

export interface PublicTransaction {
  transaction_code: string;
  transaction_date: string;
  type: "INCOME" | "EXPENSE";
  category: string | null;
  amount: number;
  description: string | null;
  event_name: string | null;
}

export const getPublicTransactions = cache((limit: number) =>
  load(async () => {
    const supabase = await createClient();
    const rows = must(await supabase.rpc("public_transactions", { p_slug: ORG_SLUG, p_limit: limit })) as PublicTransaction[];
    return rows.map((r) => ({ ...r, amount: toNumber(r.amount) }));
  }),
);

export type PublicEvent = EventRow & { coverUrl: string | null };

const EVENT_COLUMNS =
  "id,organization_id,name,slug,kind,description,cover,location,start_date,end_date,status,budget,target_participant,actual_participant,is_public,created_by,created_at,updated_at";

export const getPublicEvents = cache((filter: "upcoming" | "past" | "all", limit = 24) =>
  load(async () => {
    const supabase = await createClient();
    const org = await getOrganization();
    if (!org.data) return [] as PublicEvent[];
    let q = supabase.from("events").select(EVENT_COLUMNS).eq("organization_id", org.data.id).eq("is_public", true).neq("status", "DRAFT");
    const now = new Date().toISOString();
    if (filter === "upcoming") q = q.gte("end_date", now).neq("status", "CANCELLED").order("start_date", { ascending: true });
    else if (filter === "past") q = q.lt("end_date", now).order("start_date", { ascending: false });
    else q = q.order("start_date", { ascending: false });
    const rows = must(await q.limit(limit)) as EventRow[];
    return rows.map((e) => ({ ...e, budget: toNumber(e.budget), coverUrl: mediaUrl(e.cover) }));
  }),
);

export const getPublicEventBySlug = cache((slug: string) =>
  load(async () => {
    const supabase = await createClient();
    const org = await getOrganization();
    if (!org.data) return null;
    const event = must(
      await supabase
        .from("events")
        .select(EVENT_COLUMNS)
        .eq("organization_id", org.data.id)
        .eq("slug", slug)
        .eq("is_public", true)
        .neq("status", "DRAFT")
        .maybeSingle<EventRow>(),
    );
    if (!event) return null;
    const [schedules, finance, progress, docs] = await Promise.all([
      supabase.from("event_schedules").select("id,event_id,title,start_at,end_at,location,pic,notes").eq("event_id", event.id).order("start_at"),
      supabase.rpc("public_event_finance", { p_event: event.id }),
      supabase.rpc("public_event_progress", { p_event: event.id }),
      supabase
        .from("documents")
        .select("id,file_path,caption,width,height,created_at")
        .eq("event_id", event.id)
        .eq("visibility", "PUBLIC")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
    const docRows = (docs.data ?? []) as Pick<DocumentRow, "id" | "file_path" | "caption" | "width" | "height" | "created_at">[];
    const urls = await signedUrls(supabase, "documentation", docRows.map((d) => d.file_path));
    const fin = finance.data as { budget: number; income: number; expense: number; remaining_budget: number; budget_used_pct: number } | null;
    return {
      event: { ...event, budget: toNumber(event.budget), coverUrl: mediaUrl(event.cover) } as PublicEvent,
      schedules: (schedules.data ?? []) as EventSchedule[],
      finance: fin
        ? {
            budget: toNumber(fin.budget),
            income: toNumber(fin.income),
            expense: toNumber(fin.expense),
            remaining: toNumber(fin.remaining_budget),
            usedPct: toNumber(fin.budget_used_pct),
          }
        : null,
      progress: (progress.data as { total: number; done: number } | null) ?? { total: 0, done: 0 },
      documents: docRows.map((d) => ({ ...d, url: urls[d.file_path] ?? null })),
    };
  }),
);

export type PublicDocument = Pick<DocumentRow, "id" | "file_path" | "caption" | "width" | "height" | "taken_at" | "created_at" | "event_id"> & {
  url: string | null;
  event_name: string | null;
};

export const getPublicDocuments = cache((limit: number, offset = 0, eventId?: string) =>
  load(async () => {
    const supabase = await createClient();
    const org = await getOrganization();
    if (!org.data) return { items: [] as PublicDocument[], total: 0 };
    let q = supabase
      .from("documents")
      .select("id,file_path,caption,width,height,taken_at,created_at,event_id,events(name)", { count: "exact" })
      .eq("organization_id", org.data.id)
      .eq("visibility", "PUBLIC")
      .order("taken_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (eventId) q = q.eq("event_id", eventId);
    const res = await q.range(offset, offset + limit - 1);
    if (res.error) throw new Error(res.error.message);
    const rows = (res.data ?? []) as unknown as (Omit<PublicDocument, "url" | "event_name"> & { events: { name: string } | null })[];
    const urls = await signedUrls(supabase, "documentation", rows.map((r) => r.file_path));
    return {
      total: res.count ?? rows.length,
      items: rows.map(({ events, ...r }) => ({ ...r, url: urls[r.file_path] ?? null, event_name: events?.name ?? null })),
    };
  }),
);

export type AchievementWithProgress = Achievement & { progress: number; unlocked_at: string | null };

export const getAchievements = cache(() =>
  load(async () => {
    const supabase = await createClient();
    const org = await getOrganization();
    const [all, mine] = await Promise.all([
      supabase.from("achievements").select("*").order("sort_order"),
      org.data
        ? supabase.from("organization_achievements").select("achievement_id,progress,unlocked_at").eq("organization_id", org.data.id)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const map = new Map(((mine.data ?? []) as OrgAchievement[]).map((r) => [r.achievement_id, r]));
    return (must(all) as Achievement[]).map((a) => ({
      ...a,
      progress: map.get(a.id)?.progress ?? 0,
      unlocked_at: map.get(a.id)?.unlocked_at ?? null,
    })) as AchievementWithProgress[];
  }),
);

export const getActivityFeed = cache((limit: number) =>
  load(async () => {
    const supabase = await createClient();
    return must(await supabase.rpc("public_activity_feed", { p_slug: ORG_SLUG, p_limit: limit })) as {
      kind: "event" | "document" | "finance";
      title: string;
      happened_at: string;
      link: string;
    }[];
  }),
);

export const getInventorySummary = cache(() =>
  load(async () => {
    const supabase = await createClient();
    const rows = must(await supabase.rpc("public_inventory_summary", { p_slug: ORG_SLUG })) as {
      name: string;
      category: string | null;
      total: number;
      available: number;
      photo: string | null;
    }[];
    return rows.map((r) => ({ ...r, photoUrl: mediaUrl(r.photo) }));
  }),
);

export async function lookupUnit(code: string) {
  return load(async () => {
    const supabase = await createClient();
    const rows = must(await supabase.rpc("public_unit_lookup", { p_slug: ORG_SLUG, p_code: code })) as {
      unit_code: string;
      status: import("@/types/db").UnitStatus;
      condition: import("@/types/db").ItemCondition;
      item_name: string;
      item_photo: string | null;
      category: string | null;
      unit_label: string;
      location: string | null;
    }[];
    const row = rows[0];
    return row ? { ...row, photoUrl: mediaUrl(row.item_photo) } : null;
  });
}
