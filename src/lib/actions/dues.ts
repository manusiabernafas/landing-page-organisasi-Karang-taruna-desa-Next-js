"use server";

import { z } from "zod";
import { fail, friendlyError, ok, type ActionResult } from "./result";
import { guard, revalidateBasecamp, zodFieldErrors } from "./helpers";

const monthStr = z.string().regex(/^\d{4}-\d{2}-01$/, "Periode tidak valid.");

export async function generateBillsAction(period: string): Promise<ActionResult> {
  const g = await guard("households.manage");
  if (!g.ok) return fail(g.error);
  if (!monthStr.safeParse(period).success) return fail("Periode tidak valid.");
  const { data, error } = await g.supabase.rpc("generate_dues_bills", { p_period: period });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  const n = Number(data ?? 0);
  return ok(n > 0 ? `${n} tagihan dibuat untuk bulan ini.` : "Semua rumah aktif sudah punya tagihan bulan ini.");
}

const paySchema = z.object({
  household_id: z.string().uuid(),
  amount: z.number({ message: "Nominal wajib diisi." }).gt(0, "Nominal harus lebih dari 0.").max(100_000_000),
  paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi."),
  account_id: z.string().uuid("Pilih akun kas."),
  payment_method: z.enum(["CASH", "TRANSFER", "QRIS", "EWALLET", "OTHER"]),
  note: z.string().max(300).optional(),
});
export type PayInput = z.infer<typeof paySchema>;

export async function recordPaymentAction(input: PayInput): Promise<ActionResult> {
  const g = await guard("dues.pay");
  if (!g.ok) return fail(g.error);
  const parsed = paySchema.safeParse(input);
  if (!parsed.success) return fail("Periksa kembali isian pembayaran.", zodFieldErrors(parsed.error));
  const v = parsed.data;
  const { error } = await g.supabase.rpc("record_dues_payment", {
    p_household: v.household_id,
    p_amount: v.amount,
    p_paid_at: v.paid_at,
    p_account: v.account_id,
    p_method: v.payment_method,
    p_note: v.note ?? null,
  });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp("/transparansi");
  return ok("Pembayaran iuran tercatat dan masuk kas.");
}

const periodPaySchema = z.object({
  household_id: z.string().uuid(),
  period: monthStr,
  paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  account_id: z.string().uuid("Pilih akun kas."),
  payment_method: z.enum(["CASH", "TRANSFER", "QRIS", "EWALLET", "OTHER"]),
});

/** Tandai lunas satu bulan tertentu (dari kartu iuran). */
export async function payPeriodAction(input: z.infer<typeof periodPaySchema>): Promise<ActionResult> {
  const g = await guard("dues.pay");
  if (!g.ok) return fail(g.error);
  const parsed = periodPaySchema.safeParse(input);
  if (!parsed.success) return fail("Isian belum valid.");
  const v = parsed.data;
  const { error } = await g.supabase.rpc("pay_dues_period", {
    p_household: v.household_id,
    p_period: v.period,
    p_paid_at: v.paid_at,
    p_account: v.account_id,
    p_method: v.payment_method,
  });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp("/transparansi");
  return ok("Ditandai lunas dan masuk kas.");
}

export async function cancelPaymentAction(id: string, reason?: string): Promise<ActionResult> {
  const g = await guard("dues.pay");
  if (!g.ok) return fail(g.error);
  if (!reason || reason.trim().length < 3) return fail("Tuliskan alasan pembatalan.");
  const { error } = await g.supabase.rpc("cancel_dues_payment", { p_payment: id, p_reason: reason.trim() });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp("/transparansi");
  return ok("Pembayaran dibatalkan. Kas dikoreksi dengan reversal.");
}

export async function waiveBillAction(id: string, waived: boolean, note?: string): Promise<ActionResult> {
  const g = await guard("dues.pay");
  if (!g.ok) return fail(g.error);
  const { error } = await g.supabase.rpc("set_bill_waived", { p_bill: id, p_waived: waived, p_note: note ?? null });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok(waived ? "Tagihan dibebaskan untuk bulan ini." : "Pembebasan tagihan dibatalkan.");
}

const householdSchema = z.object({
  name: z.string().trim().min(2, "Nama tagihan minimal 2 karakter.").max(120),
  address: z.string().trim().max(200).optional(),
  monthly_fee: z.number({ message: "Nominal wajib diisi." }).min(0, "Tidak boleh negatif.").max(10_000_000),
  is_active: z.boolean(),
  host_eligible: z.boolean(),
  notes: z.string().max(300).optional(),
  member_ids: z.array(z.string().uuid()).max(20),
});
export type HouseholdInput = z.infer<typeof householdSchema>;

export async function saveHouseholdAction(input: HouseholdInput, id?: string): Promise<ActionResult<{ id: string }>> {
  const g = await guard("households.manage");
  if (!g.ok) return fail(g.error);
  const parsed = householdSchema.safeParse(input);
  if (!parsed.success) return fail("Periksa kembali isian tagihan.", zodFieldErrors(parsed.error));
  const v = parsed.data;
  const orgId = g.session.organization.id;
  const row = { name: v.name, address: v.address || null, monthly_fee: v.monthly_fee, is_active: v.is_active, host_eligible: v.host_eligible, notes: v.notes || null };
  let hid = id;
  if (id) {
    const { error } = await g.supabase.from("households").update(row).eq("id", id);
    if (error) return fail(error.code === "23505" ? "Nama tagihan sudah dipakai." : friendlyError(error));
  } else {
    const { data, error } = await g.supabase.from("households").insert({ ...row, organization_id: orgId }).select("id").single();
    if (error) return fail(error.code === "23505" ? "Nama tagihan sudah dipakai." : friendlyError(error));
    hid = data.id as string;
  }
  // Anggota dipindah ke tagihan ini (satu anggota hanya di satu tagihan).
  const { error: delErr } = await g.supabase.from("household_members").delete().eq("household_id", hid!).not("member_id", "in", `(${v.member_ids.join(",") || "00000000-0000-0000-0000-000000000000"})`);
  if (delErr) return fail(friendlyError(delErr));
  if (v.member_ids.length) {
    const { error: upErr } = await g.supabase
      .from("household_members")
      .upsert(v.member_ids.map((m) => ({ member_id: m, household_id: hid!, organization_id: orgId })), { onConflict: "member_id" });
    if (upErr) return fail(friendlyError(upErr));
  }
  revalidateBasecamp();
  return ok(id ? "Tagihan diperbarui. Nominal baru berlaku untuk tagihan bulan berikutnya." : "Tagihan dibuat.", { id: hid! });
}

export async function createSingleHouseholdsAction(fee: number): Promise<ActionResult> {
  const g = await guard("households.manage");
  if (!g.ok) return fail(g.error);
  if (!(fee >= 0 && fee <= 10_000_000)) return fail("Nominal tidak valid.");
  const orgId = g.session.organization.id;
  const { data: members } = await g.supabase.from("members").select("id,name, hm:household_members(household_id)").eq("organization_id", orgId).eq("status", "ACTIVE");
  const lonely = ((members ?? []) as unknown as { id: string; name: string; hm: unknown }[]).filter((m) => !m.hm || (Array.isArray(m.hm) && m.hm.length === 0));
  let made = 0;
  for (const m of lonely) {
    const { data, error } = await g.supabase.from("households").insert({ organization_id: orgId, name: m.name, monthly_fee: fee }).select("id").single();
    if (error) continue;
    await g.supabase.from("household_members").insert({ member_id: m.id, household_id: data.id, organization_id: orgId });
    made++;
  }
  revalidateBasecamp();
  return ok(made ? `${made} tagihan perorangan dibuat.` : "Semua anggota aktif sudah masuk tagihan.");
}

/* ------------------------------ Arisan rapat ------------------------------ */
const drawSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  meeting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  note: z.string().max(200).optional(),
});

export async function drawHostAction(input: z.infer<typeof drawSchema>): Promise<ActionResult<{ name: string; members: string[] }>> {
  const g = await guard("arisan.manage");
  if (!g.ok) return fail(g.error);
  const parsed = drawSchema.safeParse(input);
  if (!parsed.success) return fail("Isian kocokan belum valid.");
  const { data, error } = await g.supabase.rpc("draw_meeting_host", {
    p_year: parsed.data.year,
    p_meeting_date: parsed.data.meeting_date || null,
    p_event: null,
    p_note: parsed.data.note ?? null,
  });
  if (error) return fail(friendlyError(error));
  const { data: row } = await g.supabase
    .from("host_draws")
    .select("household:households(name, members:household_members(member:members(name)))")
    .eq("id", data as string)
    .single();
  const h = (row as unknown as { household: { name: string; members: { member: { name: string } | null }[] } }).household;
  revalidateBasecamp();
  return ok(`Tuan rumah rapat berikutnya: ${h.name}`, { name: h.name, members: h.members.map((m) => m.member?.name ?? "").filter(Boolean) });
}

export async function setHostAction(year: number, householdId: string, meetingDate: string | null): Promise<ActionResult> {
  const g = await guard("arisan.manage");
  if (!g.ok) return fail(g.error);
  const { error } = await g.supabase.rpc("set_meeting_host", { p_year: year, p_household: householdId, p_meeting_date: meetingDate || null, p_note: "Ditetapkan manual" });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok("Tuan rumah rapat ditetapkan.");
}

export async function undoHostAction(id: string): Promise<ActionResult> {
  const g = await guard("arisan.manage");
  if (!g.ok) return fail(g.error);
  const { error } = await g.supabase.rpc("undo_meeting_host", { p_draw: id });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok("Hasil kocokan dibatalkan. Rumah itu kembali ikut kocokan.");
}
