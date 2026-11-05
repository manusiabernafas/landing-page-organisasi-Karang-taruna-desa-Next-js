import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mediaUrl } from "./storage";
import { toNumber } from "@/lib/utils/format";
import type { Borrowing, BorrowingItem, InventoryCategory, InventoryItem, InventoryUnit, Maintenance, UnitHistory } from "@/types/db";

export async function getInventoryCategories(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("inventory_categories").select("id,name,description,icon").eq("organization_id", orgId).order("name");
  return (data ?? []) as InventoryCategory[];
}

export async function listItems(orgId: string, opts: { q?: string; category?: string; archived?: boolean; page: number; pageSize: number }) {
  const supabase = await createClient();
  let q = supabase
    .from("inventory_items")
    .select("*, category:inventory_categories(name)", { count: "exact" })
    .eq("organization_id", orgId)
    .eq("is_archived", Boolean(opts.archived));
  if (opts.category && /^[0-9a-f-]{36}$/.test(opts.category)) q = q.eq("category_id", opts.category);
  if (opts.q) {
    const term = opts.q.replace(/[%,()*]/g, " ").trim();
    if (term) q = q.or(`name.ilike.%${term}%,asset_code.ilike.%${term}%,unit_prefix.ilike.%${term}%`);
  }
  const from = (opts.page - 1) * opts.pageSize;
  const { data, count, error } = await q.order("name").range(from, from + opts.pageSize - 1);
  if (error) throw new Error(error.message);
  return {
    total: count ?? 0,
    items: ((data ?? []) as (InventoryItem & { category: { name: string } | null })[]).map((i) => ({ ...i, photoUrl: mediaUrl(i.photo) })),
  };
}

export async function getItemDetail(id: string) {
  const supabase = await createClient();
  const { data: item, error } = await supabase.from("inventory_items").select("*, category:inventory_categories(id,name)").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!item) return null;
  const { data: units } = await supabase.from("inventory_units").select("*").eq("inventory_item_id", id).order("unit_code");
  const unitIds = ((units ?? []) as InventoryUnit[]).map((u) => u.id);
  const { data: maint } = unitIds.length
    ? await supabase.from("inventory_maintenance").select("*").in("inventory_unit_id", unitIds).neq("status", "DONE")
    : { data: [] };
  const typed = item as InventoryItem & { category: { id: string; name: string } | null };
  return {
    item: { ...typed, purchase_price: typed.purchase_price === null ? null : toNumber(typed.purchase_price), photoUrl: mediaUrl(typed.photo) },
    units: (units ?? []) as InventoryUnit[],
    openMaintenance: (maint ?? []) as Maintenance[],
  };
}

export async function getUnitByCode(orgId: string, code: string) {
  const supabase = await createClient();
  const { data: unit } = await supabase
    .from("inventory_units")
    .select("*, item:inventory_items(id,name,photo,unit_label,location,category:inventory_categories(name))")
    .eq("organization_id", orgId)
    .ilike("unit_code", code)
    .maybeSingle();
  if (!unit) return null;
  const u = unit as InventoryUnit & { item: { id: string; name: string; photo: string | null; unit_label: string; location: string | null; category: { name: string } | null } };
  const [history, borrowItems, maint] = await Promise.all([
    supabase.from("inventory_unit_history").select("*").eq("inventory_unit_id", u.id).order("created_at", { ascending: false }).limit(50),
    supabase
      .from("borrowing_items")
      .select("*, borrowing:borrowings(id,borrowing_code,borrower_name,purpose,status,borrow_date,expected_return_date,actual_return_date)")
      .eq("inventory_unit_id", u.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("inventory_maintenance").select("*").eq("inventory_unit_id", u.id).order("started_at", { ascending: false }),
  ]);
  const hist = (history.data ?? []) as UnitHistory[];
  const actorIds = Array.from(new Set(hist.map((h) => h.actor_id).filter(Boolean))) as string[];
  const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id,full_name").in("id", actorIds) : { data: [] };
  const names = new Map(((actors ?? []) as { id: string; full_name: string }[]).map((a) => [a.id, a.full_name]));
  type BI = BorrowingItem & { borrowing: Pick<Borrowing, "id" | "borrowing_code" | "borrower_name" | "purpose" | "status" | "borrow_date" | "expected_return_date" | "actual_return_date"> | null };
  const bi = (borrowItems.data ?? []) as BI[];
  return {
    unit: { ...u, item: { ...u.item, photoUrl: mediaUrl(u.item.photo) } },
    history: hist.map((h) => ({ ...h, actorName: h.actor_id ? names.get(h.actor_id) ?? null : null })),
    borrowings: bi,
    activeBorrowing: bi.find((b) => b.borrowing && ["REQUESTED", "APPROVED", "BORROWED"].includes(b.borrowing.status))?.borrowing ?? null,
    maintenance: ((maint.data ?? []) as Maintenance[]).map((m) => ({ ...m, cost: m.cost === null ? null : toNumber(m.cost) })),
  };
}

export async function listUnits(orgId: string, opts: { status?: string; q?: string; page: number; pageSize: number }) {
  const supabase = await createClient();
  let q = supabase.from("inventory_units").select("*, item:inventory_items(id,name,unit_label)", { count: "exact" }).eq("organization_id", orgId);
  if (opts.status && ["AVAILABLE", "BORROWED", "MAINTENANCE", "DAMAGED", "LOST"].includes(opts.status)) q = q.eq("status", opts.status);
  if (opts.q) {
    const term = opts.q.replace(/[%,()*]/g, " ").trim();
    if (term) q = q.ilike("unit_code", `%${term}%`);
  }
  const from = (opts.page - 1) * opts.pageSize;
  const { data, count, error } = await q.order("unit_code").range(from, from + opts.pageSize - 1);
  if (error) throw new Error(error.message);
  return { total: count ?? 0, items: (data ?? []) as (InventoryUnit & { item: { id: string; name: string; unit_label: string } | null })[] };
}

export async function listMaintenance(orgId: string, status: "active" | "done") {
  const supabase = await createClient();
  let q = supabase.from("inventory_maintenance").select("*, unit:inventory_units(id,unit_code,condition,status,item:inventory_items(name))").eq("organization_id", orgId);
  q = status === "active" ? q.neq("status", "DONE").order("started_at") : q.eq("status", "DONE").order("completed_at", { ascending: false }).limit(50);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return ((data ?? []) as (Maintenance & { unit: { id: string; unit_code: string; condition: string; status: string; item: { name: string } | null } | null })[]).map((m) => ({
    ...m,
    cost: m.cost === null ? null : toNumber(m.cost),
  }));
}
