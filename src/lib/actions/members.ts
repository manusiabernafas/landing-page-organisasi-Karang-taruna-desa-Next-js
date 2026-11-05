"use server";

import { memberSchema } from "@/lib/validations/members";
import { uploadFile, UploadError } from "@/lib/services/upload";
import { UPLOAD_LIMITS } from "@/lib/config";
import { fail, friendlyError, ok, type ActionResult } from "./result";
import { fileFrom, guard, parsePayload, revalidateBasecamp, zodFieldErrors } from "./helpers";

export async function saveMemberAction(formData: FormData, id?: string): Promise<ActionResult<{ id: string }>> {
  const g = await guard("members.manage");
  if (!g.ok) return fail(g.error);
  const parsed = memberSchema.safeParse(parsePayload(formData));
  if (!parsed.success) return fail("Periksa kembali isian anggota.", zodFieldErrors(parsed.error));
  const v = parsed.data;
  const orgId = g.session.organization.id;

  let photo: string | undefined;
  const file = fileFrom(formData, "photo");
  if (file) {
    try {
      photo = (await uploadFile(g.supabase, "avatars", orgId, "members", file, { maxBytes: UPLOAD_LIMITS.avatarMaxBytes })).path;
    } catch (e) {
      const msg = e instanceof UploadError ? e.message : "Foto belum berhasil diunggah.";
      return fail(msg, { photo: msg });
    }
  }

  const row = {
    name: v.name,
    nickname: v.nickname || null,
    join_date: v.join_date,
    role: v.role,
    status: v.status,
    bio: v.bio || null,
    ...(photo ? { photo } : {}),
  };
  let memberId = id;
  if (id) {
    const { data, error } = await g.supabase.from("members").update(row).eq("id", id).select("id");
    if (error) return fail(friendlyError(error));
    if (!data?.length) return fail("Anggota tidak ditemukan.");
  } else {
    const { data, error } = await g.supabase.from("members").insert({ ...row, organization_id: orgId }).select("id").single();
    if (error) return fail(friendlyError(error));
    memberId = data.id as string;
  }
  const { error: pErr } = await g.supabase
    .from("member_private")
    .upsert({ member_id: memberId, organization_id: orgId, phone: v.phone || null, address: v.address || null }, { onConflict: "member_id" });
  if (pErr) return fail(`Data utama tersimpan, kontak belum: ${friendlyError(pErr)}`);
  revalidateBasecamp();
  return ok(id ? "Data anggota diperbarui." : "Anggota baru bergabung di basecamp!", { id: memberId! });
}
