"use server";

import { borrowingSchema, returnSchema, type BorrowingInput, type ReturnInput } from "@/lib/validations/borrowings";
import { can } from "@/lib/permissions";
import { fail, friendlyError, ok, type ActionResult } from "./result";
import { guard, revalidateBasecamp, zodFieldErrors } from "./helpers";

export async function createBorrowingAction(input: BorrowingInput): Promise<ActionResult<{ id: string }>> {
  const g = await guard("borrowing.request");
  if (!g.ok) return fail(g.error);
  const parsed = borrowingSchema.safeParse(input);
  if (!parsed.success) return fail("Periksa kembali isian peminjaman.", zodFieldErrors(parsed.error));
  const v = parsed.data;
  const approve = v.auto_approve && can(g.session.profile.role, "borrowing.approve");
  const { data, error } = await g.supabase.rpc("create_borrowing", {
    p: {
      ...v,
      borrower_phone: v.borrower_phone || null,
      borrower_member_id: v.borrower_member_id || null,
      event_id: v.event_id || null,
      notes: v.notes || null,
      auto_approve: approve,
    },
  });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok(approve ? "Peminjaman dibuat dan disetujui. Lanjutkan serah terima barang." : "Pengajuan terkirim. Pengurus akan meninjau.", { id: data as string });
}

export async function decideBorrowingAction(id: string, approve: boolean, reason?: string): Promise<ActionResult> {
  const g = await guard("borrowing.approve");
  if (!g.ok) return fail(g.error);
  if (!approve && (!reason || reason.trim().length < 3)) return fail("Tuliskan alasan penolakan.");
  const { error } = await g.supabase.rpc("approve_borrowing", { p_id: id, p_approve: approve, p_reason: reason?.trim() || null });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok(approve ? "Peminjaman disetujui." : "Peminjaman ditolak.");
}

export async function cancelBorrowingAction(id: string): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return fail(g.error);
  const { error } = await g.supabase.rpc("cancel_borrowing", { p_id: id });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok("Peminjaman dibatalkan.");
}

export async function handoverBorrowingAction(id: string): Promise<ActionResult> {
  const g = await guard("borrowing.approve");
  if (!g.ok) return fail(g.error);
  const { error } = await g.supabase.rpc("handover_borrowing", { p_id: id });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok("Barang diserahkan. Status unit menjadi Dipinjam.");
}

export async function returnBorrowingAction(id: string, input: ReturnInput): Promise<ActionResult> {
  const g = await guard("borrowing.approve");
  if (!g.ok) return fail(g.error);
  const parsed = returnSchema.safeParse(input);
  if (!parsed.success) return fail("Kondisi setelah pinjam wajib diisi untuk setiap unit.", zodFieldErrors(parsed.error));
  const { error } = await g.supabase.rpc("return_borrowing", {
    p_id: id,
    p_items: parsed.data.items.map((i) => ({ ...i, notes: i.notes?.trim() || null })),
    p_return_date: parsed.data.return_date,
  });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  const damaged = parsed.data.items.filter((i) => i.condition_after === "DAMAGED").length;
  const lost = parsed.data.items.filter((i) => i.condition_after === "LOST").length;
  return ok(
    damaged || lost
      ? `Pengembalian tercatat.${damaged ? ` ${damaged} unit rusak otomatis masuk maintenance.` : ""}${lost ? ` ${lost} unit tercatat hilang.` : ""}`
      : "Pengembalian tercatat. Semua unit kembali tersedia.",
  );
}
