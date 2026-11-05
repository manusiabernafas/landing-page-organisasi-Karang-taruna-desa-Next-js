"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { addUnitsSchema, inventoryCategorySchema, itemSchema } from "@/lib/validations/inventory";
import { uploadFile, UploadError } from "@/lib/services/upload";
import { fail, friendlyError, ok, type ActionResult } from "./result";
import { fileFrom, guard, parsePayload, revalidateBasecamp, zodFieldErrors } from "./helpers";
import type { ItemCondition } from "@/types/db";

export async function saveItemAction(formData: FormData, id?: string): Promise<ActionResult<{ id: string }>> {
  const g = await guard("inventory.manage");
  if (!g.ok) return fail(g.error);
  const { session, supabase } = g;
  const parsed = itemSchema.safeParse(parsePayload(formData));
  if (!parsed.success) return fail("Periksa kembali isian barang.", zodFieldErrors(parsed.error));
  const v = parsed.data;

  let photo: string | undefined;
  const file = fileFrom(formData, "photo");
  if (file) {
    try {
      photo = (await uploadFile(supabase, "media", session.organization.id, "inventory", file)).path;
    } catch (e) {
      const msg = e instanceof UploadError ? e.message : "Foto belum berhasil diunggah.";
      return fail(msg, { photo: msg });
    }
  }

  const row = {
    name: v.name,
    category_id: v.category_id || null,
    description: v.description?.trim() || null,
    unit_label: v.unit_label,
    purchase_date: v.purchase_date || null,
    purchase_price: v.purchase_price ?? null,
    location: v.location?.trim() || null,
    ...(photo ? { photo } : {}),
  };

  if (id) {
    const { data, error } = await supabase
      .from("inventory_items")
      .update({ ...row, ...(v.asset_code ? { asset_code: v.asset_code } : {}) })
      .eq("id", id)
      .select("id");
    if (error) return fail(friendlyError(error));
    if (!data?.length) return fail("Barang tidak ditemukan.");
    revalidateBasecamp();
    return ok("Data barang diperbarui.", { id });
  }

  let assetCode = v.asset_code;
  if (!assetCode) {
    const { count } = await supabase.from("inventory_items").select("id", { count: "exact", head: true }).eq("organization_id", session.organization.id);
    assetCode = `INV-${String((count ?? 0) + 1).padStart(3, "0")}`;
  }
  const { data, error } = await supabase
    .from("inventory_items")
    .insert({ ...row, organization_id: session.organization.id, asset_code: assetCode, unit_prefix: v.unit_prefix })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return fail("Kode aset atau prefix unit sudah dipakai barang lain.", { unit_prefix: "Prefix sudah dipakai." });
    return fail(friendlyError(error));
  }
  if (v.initial_quantity > 0) {
    const r = await supabase.rpc("create_inventory_units", { p_item: data.id, p_quantity: v.initial_quantity, p_condition: v.initial_condition });
    if (r.error) return fail(`Barang tersimpan, tetapi unit belum dibuat: ${friendlyError(r.error)}`);
  }
  revalidateBasecamp();
  return ok(
    v.initial_quantity > 0
      ? `Barang tersimpan. ${v.initial_quantity} unit dibuat: ${v.unit_prefix}-001 s/d ${v.unit_prefix}-${String(v.initial_quantity).padStart(3, "0")}.`
      : "Barang tersimpan.",
    { id: data.id as string },
  );
}

export async function addUnitsAction(itemId: string, input: z.infer<typeof addUnitsSchema>): Promise<ActionResult> {
  const g = await guard("inventory.manage");
  if (!g.ok) return fail(g.error);
  const parsed = addUnitsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Jumlah belum valid.");
  const { error } = await g.supabase.rpc("create_inventory_units", { p_item: itemId, p_quantity: parsed.data.quantity, p_condition: parsed.data.condition });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok(`${parsed.data.quantity} unit baru ditambahkan lengkap dengan kode & QR.`);
}

export async function archiveItemAction(id: string, archived: boolean): Promise<ActionResult> {
  const g = await guard("inventory.manage");
  if (!g.ok) return fail(g.error);
  if (archived) {
    const { count } = await g.supabase.from("inventory_units").select("id", { count: "exact", head: true }).eq("inventory_item_id", id).eq("status", "BORROWED");
    if ((count ?? 0) > 0) return fail("Masih ada unit yang dipinjam. Selesaikan pengembalian dulu.");
  }
  const { error } = await g.supabase.from("inventory_items").update({ is_archived: archived }).eq("id", id);
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok(archived ? "Barang diarsipkan. Riwayat tetap tersimpan." : "Barang diaktifkan kembali.");
}

export async function saveInventoryCategoryAction(input: z.infer<typeof inventoryCategorySchema>, id?: string): Promise<ActionResult> {
  const g = await guard("inventory.manage");
  if (!g.ok) return fail(g.error);
  const parsed = inventoryCategorySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Isian belum valid.");
  const row = { name: parsed.data.name, description: parsed.data.description || null };
  const { error } = id
    ? await g.supabase.from("inventory_categories").update(row).eq("id", id)
    : await g.supabase.from("inventory_categories").insert({ ...row, organization_id: g.session.organization.id });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok(id ? "Kategori diperbarui." : "Kategori ditambahkan.");
}

export async function deleteInventoryCategoryAction(id: string): Promise<ActionResult> {
  const g = await guard("inventory.manage");
  if (!g.ok) return fail(g.error);
  const { count } = await g.supabase.from("inventory_items").select("id", { count: "exact", head: true }).eq("category_id", id);
  if ((count ?? 0) > 0) return fail("Kategori masih dipakai barang. Pindahkan barangnya dulu.");
  const { error } = await g.supabase.from("inventory_categories").delete().eq("id", id);
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok("Kategori dihapus.");
}

export async function setUnitConditionAction(unitId: string, condition: ItemCondition, note?: string): Promise<ActionResult> {
  const g = await guard("inventory.manage");
  if (!g.ok) return fail(g.error);
  const { error } = await g.supabase.rpc("set_unit_condition", { p_unit: unitId, p_condition: condition, p_note: note?.trim() || null });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok(condition === "DAMAGED" ? "Unit ditandai rusak dan otomatis masuk maintenance." : "Kondisi unit diperbarui.");
}

export async function startMaintenanceAction(unitId: string, issue?: string): Promise<ActionResult> {
  const g = await guard("inventory.manage");
  if (!g.ok) return fail(g.error);
  if (!issue || issue.trim().length < 3) return fail("Tuliskan keterangan kerusakan.");
  const { error } = await g.supabase.rpc("start_maintenance", { p_unit: unitId, p_issue: issue.trim() });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok("Unit masuk maintenance dan tidak bisa dipinjam sampai selesai.");
}

const completeSchema = z.object({
  result: z.enum(["EXCELLENT", "GOOD", "FAIR", "DAMAGED", "LOST"]),
  cost: z.number().min(0).max(999_999_999).nullable().optional(),
  notes: z.string().max(500).optional(),
});

export async function completeMaintenanceAction(id: string, input: z.infer<typeof completeSchema>): Promise<ActionResult> {
  const g = await guard("inventory.manage");
  if (!g.ok) return fail(g.error);
  const parsed = completeSchema.safeParse(input);
  if (!parsed.success) return fail("Periksa kembali isian.");
  const { error } = await g.supabase.rpc("complete_maintenance", {
    p_id: id,
    p_result: parsed.data.result,
    p_cost: parsed.data.cost ?? null,
    p_notes: parsed.data.notes?.trim() || null,
  });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok(
    parsed.data.result === "DAMAGED"
      ? "Maintenance ditutup. Unit tercatat rusak permanen."
      : parsed.data.result === "LOST"
        ? "Maintenance ditutup. Unit tercatat hilang."
        : "Maintenance selesai. Unit kembali tersedia.",
  );
}

export async function updateUnitNotesAction(unitId: string, notes: string): Promise<ActionResult> {
  const g = await guard("inventory.manage");
  if (!g.ok) return fail(g.error);
  const { error } = await g.supabase.from("inventory_units").update({ notes: notes.trim().slice(0, 300) || null }).eq("id", unitId);
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok("Catatan unit disimpan.");
}

export async function goToUnitAction(formData: FormData) {
  const code = String(formData.get("code") ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 20);
  if (!code) redirect("/dashboard/inventory/scan?error=kosong");
  redirect(`/dashboard/inventory/units/${code}`);
}
