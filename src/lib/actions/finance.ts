"use server";

import { redirect } from "next/navigation";
import { accountSchema, categorySchema, transactionSchema, type AccountInput, type CategoryInput } from "@/lib/validations/finance";
import { uploadFile, UploadError } from "@/lib/services/upload";
import { can } from "@/lib/permissions";
import { fail, friendlyError, ok, type ActionResult } from "./result";
import { fileFrom, guard, parsePayload, revalidateBasecamp, zodFieldErrors } from "./helpers";

export async function saveTransactionAction(formData: FormData, id?: string): Promise<ActionResult<{ id: string }>> {
  const g = await guard("finance.create");
  if (!g.ok) return fail(g.error);
  const { session, supabase } = g;
  const parsed = transactionSchema.safeParse(parsePayload(formData));
  if (!parsed.success) return fail("Periksa kembali isian transaksi.", zodFieldErrors(parsed.error));
  const v = parsed.data;
  const canApprove = can(session.profile.role, "finance.approve");

  let attachment: string | undefined;
  const file = fileFrom(formData, "attachment");
  if (file) {
    try {
      attachment = (await uploadFile(supabase, "attachments", session.organization.id, "transactions", file, { allowPdf: true })).path;
    } catch (e) {
      const msg = e instanceof UploadError ? e.message : "Lampiran belum berhasil diunggah.";
      return fail(msg, { attachment: msg });
    }
  }

  const approve = canApprove && v.approve_now;
  const row = {
    organization_id: session.organization.id,
    type: v.type,
    transaction_date: v.transaction_date,
    category_id: v.type === "TRANSFER" ? null : v.category_id,
    amount: v.amount,
    account_id: v.account_id,
    to_account_id: v.type === "TRANSFER" ? v.to_account_id : null,
    description: v.description?.trim() || null,
    payment_method: v.payment_method,
    is_public: approve ? v.is_public : false,
    is_approved: approve,
    ...(attachment ? { attachment } : {}),
  };

  if (id) {
    const { data, error } = await supabase.from("finance_transactions").update(row).eq("id", id).eq("is_approved", false).select("id");
    if (error) return fail(friendlyError(error));
    if (!data?.length) return fail("Transaksi yang sudah disetujui tidak dapat diubah. Gunakan reversal.");
    revalidateBasecamp("/transparansi");
    return ok("Transaksi diperbarui.", { id });
  }
  const { data, error } = await supabase
    .from("finance_transactions")
    .insert({ ...row, transaction_code: v.transaction_code || "" })
    .select("id")
    .single();
  if (error) return fail(friendlyError(error));
  revalidateBasecamp("/transparansi");
  return ok(approve ? "Transaksi tercatat dan disetujui. Saldo sudah diperbarui." : "Transaksi tercatat dan menunggu persetujuan bendahara.", {
    id: data.id as string,
  });
}

export async function approveTransactionAction(id: string): Promise<ActionResult> {
  const g = await guard("finance.approve");
  if (!g.ok) return fail(g.error);
  const { data, error } = await g.supabase.from("finance_transactions").update({ is_approved: true }).eq("id", id).eq("is_approved", false).select("id");
  if (error) return fail(friendlyError(error));
  if (!data?.length) return fail("Transaksi sudah disetujui sebelumnya.");
  revalidateBasecamp("/transparansi");
  return ok("Transaksi disetujui. Saldo sudah diperbarui.");
}

export async function setTransactionPublicAction(id: string, isPublic: boolean): Promise<ActionResult> {
  const g = await guard("finance.approve");
  if (!g.ok) return fail(g.error);
  const { error } = await g.supabase.from("finance_transactions").update({ is_public: isPublic }).eq("id", id).eq("is_approved", true);
  if (error) return fail(friendlyError(error));
  revalidateBasecamp("/transparansi");
  return ok(isPublic ? "Transaksi tampil di halaman transparansi." : "Transaksi disembunyikan dari publik.");
}

export async function deleteTransactionAction(id: string): Promise<ActionResult> {
  const g = await guard("finance.create");
  if (!g.ok) return fail(g.error);
  const { data, error } = await g.supabase.from("finance_transactions").delete().eq("id", id).select("id");
  if (error) return fail(friendlyError(error));
  if (!data?.length) return fail("Transaksi tidak ditemukan atau Anda tidak berhak menghapusnya.");
  revalidateBasecamp("/transparansi");
  redirect("/dashboard/finance/transactions?deleted=1");
}

export async function reverseTransactionAction(id: string, reason?: string): Promise<ActionResult> {
  const g = await guard("finance.approve");
  if (!g.ok) return fail(g.error);
  if (!reason || reason.trim().length < 3) return fail("Tuliskan alasan reversal.");
  const { data, error } = await g.supabase.rpc("reverse_transaction", { p_tx: id, p_reason: reason.trim() });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp("/transparansi");
  redirect(`/dashboard/finance/transactions/${data as string}?reversed=1`);
}

export async function saveCategoryAction(input: CategoryInput, id?: string): Promise<ActionResult> {
  const g = await guard("finance.manage");
  if (!g.ok) return fail(g.error);
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return fail("Periksa kembali isian kategori.", zodFieldErrors(parsed.error));
  const row = { ...parsed.data, description: parsed.data.description || null };
  const { error } = id
    ? await g.supabase.from("finance_categories").update({ name: row.name, color: row.color, description: row.description }).eq("id", id)
    : await g.supabase.from("finance_categories").insert({ ...row, organization_id: g.session.organization.id });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok(id ? "Kategori diperbarui." : "Kategori ditambahkan.");
}

export async function toggleCategoryAction(id: string, active: boolean): Promise<ActionResult> {
  const g = await guard("finance.manage");
  if (!g.ok) return fail(g.error);
  const { error } = await g.supabase.from("finance_categories").update({ is_active: active }).eq("id", id);
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok(active ? "Kategori diaktifkan." : "Kategori dinonaktifkan. Transaksi lama tetap aman.");
}

export async function saveAccountAction(input: AccountInput, id?: string): Promise<ActionResult> {
  const g = await guard("finance.manage");
  if (!g.ok) return fail(g.error);
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return fail("Periksa kembali isian akun.", zodFieldErrors(parsed.error));
  const row = { ...parsed.data, description: parsed.data.description || null };
  const { error } = id
    ? await g.supabase.from("finance_accounts").update(row).eq("id", id).neq("type", "EVENT")
    : await g.supabase.from("finance_accounts").insert({ ...row, organization_id: g.session.organization.id });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok(id ? "Akun diperbarui." : "Akun kas ditambahkan.");
}

export async function toggleAccountAction(id: string, active: boolean): Promise<ActionResult> {
  const g = await guard("finance.manage");
  if (!g.ok) return fail(g.error);
  const { error } = await g.supabase.from("finance_accounts").update({ is_active: active }).eq("id", id);
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok(active ? "Akun diaktifkan." : "Akun dinonaktifkan.");
}
