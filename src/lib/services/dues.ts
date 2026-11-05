import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toNumber } from "@/lib/utils/format";

export type DuesStatus = "UNPAID" | "PARTIAL" | "PAID" | "WAIVED";

export interface HouseholdLite {
  id: string;
  name: string;
  address: string | null;
  monthly_fee: number;
  is_active: boolean;
  host_eligible: boolean;
  notes: string | null;
  members: { id: string; name: string; nickname: string | null }[];
}

export interface Bill {
  id: string;
  household_id: string;
  period: string;
  amount_due: number;
  amount_paid: number;
  status: DuesStatus;
  notes: string | null;
}

async function loadHouseholds(orgId: string, activeOnly = true) {
  const supabase = await createClient();
  let q = supabase
    .from("households")
    .select("id,name,address,monthly_fee,is_active,host_eligible,notes, members:household_members(member:members(id,name,nickname))")
    .eq("organization_id", orgId)
    .order("name");
  if (activeOnly) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  type Row = Omit<HouseholdLite, "members" | "monthly_fee"> & { monthly_fee: number; members: { member: HouseholdLite["members"][number] | null }[] };
  return ((data ?? []) as unknown as Row[]).map((h) => ({
    ...h,
    monthly_fee: toNumber(h.monthly_fee),
    members: h.members.map((m) => m.member).filter(Boolean) as HouseholdLite["members"],
  }));
}

const toBill = (b: Bill): Bill => ({ ...b, amount_due: toNumber(b.amount_due), amount_paid: toNumber(b.amount_paid) });

/** Rekap iuran satu bulan + tunggakan total per rumah. */
export async function getDuesMonth(orgId: string, period: string) {
  const supabase = await createClient();
  const [houses, bills, outstanding] = await Promise.all([
    loadHouseholds(orgId),
    supabase.from("dues_bills").select("id,household_id,period,amount_due,amount_paid,status,notes").eq("organization_id", orgId).eq("period", period),
    supabase.from("dues_bills").select("household_id,amount_due,amount_paid,period").eq("organization_id", orgId).in("status", ["UNPAID", "PARTIAL"]).lte("period", period),
  ]);
  const billMap = new Map(((bills.data ?? []) as Bill[]).map((b) => [b.household_id, toBill(b)]));
  const owe = new Map<string, { amount: number; months: number }>();
  for (const b of (outstanding.data ?? []) as { household_id: string; amount_due: number; amount_paid: number; period: string }[]) {
    if (b.period === period) continue;
    const cur = owe.get(b.household_id) ?? { amount: 0, months: 0 };
    cur.amount += toNumber(b.amount_due) - toNumber(b.amount_paid);
    cur.months++;
    owe.set(b.household_id, cur);
  }
  const rows = houses.map((h) => ({ household: h, bill: billMap.get(h.id) ?? null, arrears: owe.get(h.id) ?? { amount: 0, months: 0 } }));
  const withBill = rows.filter((r) => r.bill);
  return {
    rows,
    billsCreated: withBill.length,
    totals: {
      due: withBill.reduce((a, r) => a + (r.bill!.status === "WAIVED" ? 0 : r.bill!.amount_due), 0),
      paid: withBill.reduce((a, r) => a + r.bill!.amount_paid, 0),
      paidCount: withBill.filter((r) => r.bill!.status === "PAID").length,
      partialCount: withBill.filter((r) => r.bill!.status === "PARTIAL").length,
      unpaidCount: withBill.filter((r) => r.bill!.status === "UNPAID").length,
      arrears: Array.from(owe.values()).reduce((a, o) => a + o.amount, 0),
    },
  };
}

/** Kartu iuran setahun: rumah × bulan. */
export async function getDuesYear(orgId: string, year: number) {
  const supabase = await createClient();
  const [houses, bills] = await Promise.all([
    loadHouseholds(orgId, false),
    supabase.from("dues_bills").select("id,household_id,period,amount_due,amount_paid,status,notes").eq("organization_id", orgId).gte("period", `${year}-01-01`).lte("period", `${year}-12-01`),
  ]);
  const map = new Map<string, Map<number, Bill>>();
  for (const b of (bills.data ?? []) as Bill[]) {
    const m = map.get(b.household_id) ?? new Map<number, Bill>();
    m.set(Number(b.period.slice(5, 7)), toBill(b));
    map.set(b.household_id, m);
  }
  return houses.filter((h) => h.is_active || map.has(h.id)).map((h) => ({ household: h, months: map.get(h.id) ?? new Map<number, Bill>() }));
}

export async function getHouseholdDetail(id: string) {
  const supabase = await createClient();
  const { data: h } = await supabase
    .from("households")
    .select("id,name,address,monthly_fee,is_active,host_eligible,notes, members:household_members(member:members(id,name,nickname))")
    .eq("id", id)
    .maybeSingle();
  if (!h) return null;
  const [bills, payments, hosts] = await Promise.all([
    supabase.from("dues_bills").select("id,household_id,period,amount_due,amount_paid,status,notes").eq("household_id", id).order("period", { ascending: false }),
    supabase
      .from("dues_payments")
      .select("id,paid_at,amount,payment_method,note,cancelled_at,cancel_reason,finance_transaction_id,created_at, allocations:dues_allocations(amount, bill:dues_bills(period))")
      .eq("household_id", id)
      .order("paid_at", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("host_draws").select("id,year,meeting_date,method").eq("household_id", id).order("year", { ascending: false }),
  ]);
  type Raw = Omit<HouseholdLite, "members"> & { members: { member: HouseholdLite["members"][number] | null }[] };
  const raw = h as unknown as Raw;
  type P = { id: string; paid_at: string; amount: number; payment_method: string; note: string | null; cancelled_at: string | null; cancel_reason: string | null; finance_transaction_id: string | null; allocations: { amount: number; bill: { period: string } | null }[] };
  return {
    household: { ...raw, monthly_fee: toNumber(raw.monthly_fee), members: raw.members.map((m) => m.member).filter(Boolean) as HouseholdLite["members"] },
    bills: ((bills.data ?? []) as Bill[]).map(toBill),
    payments: ((payments.data ?? []) as unknown as P[]).map((p) => ({
      ...p,
      amount: toNumber(p.amount),
      allocations: p.allocations.map((a) => ({ amount: toNumber(a.amount), period: a.bill?.period ?? "" })).sort((a, b) => a.period.localeCompare(b.period)),
    })),
    hosts: (hosts.data ?? []) as { id: string; year: number; meeting_date: string | null; method: string }[],
  };
}

export async function getHouseholdsForManage(orgId: string) {
  const supabase = await createClient();
  const [houses, members] = await Promise.all([
    loadHouseholds(orgId, false),
    supabase.from("members").select("id,name,status, hm:household_members(household_id)").eq("organization_id", orgId).order("name"),
  ]);
  type M = { id: string; name: string; status: string; hm: { household_id: string } | { household_id: string }[] | null };
  const mem = ((members.data ?? []) as unknown as M[]).map((m) => ({
    id: m.id,
    name: m.name,
    status: m.status,
    household_id: Array.isArray(m.hm) ? m.hm[0]?.household_id ?? null : m.hm?.household_id ?? null,
  }));
  return { houses, members: mem };
}

/** Tagihan milik anggota yang sedang login (untuk peran anggota/panitia). */
export async function getMyDues() {
  const supabase = await createClient();
  const { data: hid } = await supabase.rpc("my_household");
  if (!hid) return null;
  return getHouseholdDetail(hid as string);
}
