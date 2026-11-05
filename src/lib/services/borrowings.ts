import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Borrowing, BorrowingItem, ItemCondition, UnitStatus } from "@/types/db";

export type BorrowingListItem = Borrowing & {
  event: { name: string } | null;
  items: { id: string }[];
};

export async function listBorrowings(orgId: string, opts: { status?: string; q?: string; page: number; pageSize: number }) {
  const supabase = await createClient();
  let q = supabase.from("borrowings").select("*, event:events(name), items:borrowing_items(id)", { count: "exact" }).eq("organization_id", orgId);
  if (opts.status === "DONE") q = q.in("status", ["RETURNED", "REJECTED", "CANCELLED"]);
  else if (opts.status && ["REQUESTED", "APPROVED", "BORROWED"].includes(opts.status)) q = q.eq("status", opts.status);
  if (opts.q) {
    const term = opts.q.replace(/[%,()*]/g, " ").trim();
    if (term) q = q.or(`borrower_name.ilike.%${term}%,borrowing_code.ilike.%${term}%,purpose.ilike.%${term}%`);
  }
  const from = (opts.page - 1) * opts.pageSize;
  const { data, count, error } = await q
    .order(opts.status === "BORROWED" ? "expected_return_date" : "created_at", { ascending: opts.status === "BORROWED" })
    .range(from, from + opts.pageSize - 1);
  if (error) throw new Error(error.message);
  return { total: count ?? 0, items: (data ?? []) as BorrowingListItem[] };
}

export async function countBorrowingsByStatus(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("borrowings").select("status").eq("organization_id", orgId);
  const out: Record<string, number> = {};
  for (const r of (data ?? []) as { status: string }[]) out[r.status] = (out[r.status] ?? 0) + 1;
  return out;
}

export type BorrowingDetailItem = BorrowingItem & {
  unit: { id: string; unit_code: string; condition: ItemCondition; status: UnitStatus; item: { id: string; name: string } | null } | null;
};

export async function getBorrowing(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("borrowings")
    .select("*, event:events(id,name,status), items:borrowing_items(*, unit:inventory_units(id,unit_code,condition,status,item:inventory_items(id,name)))")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const b = data as Borrowing & { event: { id: string; name: string; status: string } | null; items: BorrowingDetailItem[] };
  const ids = [b.created_by, b.approved_by].filter(Boolean) as string[];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id,full_name").in("id", ids) : { data: [] };
  const names = new Map(((people ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));
  b.items.sort((x, y) => (x.unit?.unit_code ?? "").localeCompare(y.unit?.unit_code ?? ""));
  return {
    ...b,
    createdByName: b.created_by ? names.get(b.created_by) ?? null : null,
    approvedByName: b.approved_by ? names.get(b.approved_by) ?? null : null,
  };
}

/** Unit tersedia dikelompokkan per barang, untuk form peminjaman. */
export async function getAvailableUnits(orgId: string) {
  const supabase = await createClient();
  const [units, active] = await Promise.all([
    supabase
      .from("inventory_units")
      .select("id,unit_code,condition,item:inventory_items!inner(id,name,unit_label,is_archived)")
      .eq("organization_id", orgId)
      .eq("status", "AVAILABLE")
      .eq("item.is_archived", false)
      .order("unit_code"),
    supabase.from("borrowing_items").select("inventory_unit_id, borrowing:borrowings!inner(status)").in("borrowing.status", ["REQUESTED", "APPROVED"]),
  ]);
  const reserved = new Set(((active.data ?? []) as unknown as { inventory_unit_id: string }[]).map((r) => r.inventory_unit_id));
  const groups = new Map<string, { id: string; name: string; unit_label: string; units: { id: string; code: string; condition: ItemCondition }[] }>();
  for (const u of (units.data ?? []) as unknown as { id: string; unit_code: string; condition: ItemCondition; item: { id: string; name: string; unit_label: string } }[]) {
    if (reserved.has(u.id)) continue;
    const g = groups.get(u.item.id) ?? { id: u.item.id, name: u.item.name, unit_label: u.item.unit_label, units: [] };
    g.units.push({ id: u.id, code: u.unit_code, condition: u.condition });
    groups.set(u.item.id, g);
  }
  return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
}
