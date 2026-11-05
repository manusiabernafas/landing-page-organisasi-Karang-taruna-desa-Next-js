"use server";

import { z } from "zod";
import { uploadFile, UploadError } from "@/lib/services/upload";
import { fail, friendlyError, ok, type ActionResult } from "./result";
import { guard, parsePayload, revalidateBasecamp, zodFieldErrors } from "./helpers";

const uploadSchema = z.object({
  event_id: z.string().uuid().nullable().optional(),
  caption: z.string().trim().max(300, "Keterangan maksimal 300 karakter.").optional(),
  visibility: z.enum(["PUBLIC", "INTERNAL"]),
  taken_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  sizes: z.array(z.object({ width: z.number().int().positive().max(20000), height: z.number().int().positive().max(20000) }).nullable()).max(6),
});

export async function uploadDocumentsAction(formData: FormData): Promise<ActionResult<{ count: number }>> {
  const g = await guard("documents.upload");
  if (!g.ok) return fail(g.error);
  const parsed = uploadSchema.safeParse(parsePayload(formData));
  if (!parsed.success) return fail("Periksa kembali isian dokumentasi.", zodFieldErrors(parsed.error));
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return fail("Pilih minimal satu foto.");
  if (files.length > 6) return fail("Maksimal 6 foto sekali unggah.");
  const v = parsed.data;
  let uploaded = 0;
  const errors: string[] = [];
  for (let i = 0; i < files.length; i++) {
    try {
      const up = await uploadFile(g.supabase, "documentation", g.session.organization.id, v.event_id ? `events/${v.event_id}` : "umum", files[i]);
      const size = v.sizes[i] ?? null;
      const { error } = await g.supabase.from("documents").insert({
        organization_id: g.session.organization.id,
        event_id: v.event_id || null,
        file_path: up.path,
        mime_type: up.mime,
        size_bytes: up.size,
        width: size?.width ?? null,
        height: size?.height ?? null,
        caption: v.caption || null,
        taken_at: v.taken_at || null,
        visibility: v.visibility,
        uploaded_by: g.session.userId,
      });
      if (error) {
        await g.supabase.storage.from("documentation").remove([up.path]);
        errors.push(friendlyError(error));
      } else uploaded++;
    } catch (e) {
      errors.push(e instanceof UploadError ? `${files[i].name}: ${e.message}` : `${files[i].name}: gagal diunggah`);
    }
  }
  revalidateBasecamp("/dokumentasi");
  if (uploaded === 0) return fail(errors[0] ?? "Foto belum berhasil diunggah.");
  return ok(errors.length ? `${uploaded} foto terunggah, ${errors.length} gagal (${errors[0]}).` : `${uploaded} foto berhasil diunggah.`, { count: uploaded });
}

const updateSchema = z.object({
  caption: z.string().trim().max(300).optional(),
  visibility: z.enum(["PUBLIC", "INTERNAL"]),
  event_id: z.string().uuid().nullable().optional(),
});

export async function updateDocumentAction(id: string, input: z.infer<typeof updateSchema>): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return fail(g.error);
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail("Periksa kembali isian.", zodFieldErrors(parsed.error));
  const { data, error } = await g.supabase
    .from("documents")
    .update({ caption: parsed.data.caption || null, visibility: parsed.data.visibility, event_id: parsed.data.event_id || null })
    .eq("id", id)
    .select("id");
  if (error) return fail(friendlyError(error));
  if (!data?.length) return fail("Anda tidak berhak mengubah foto ini.");
  revalidateBasecamp("/dokumentasi");
  return ok(parsed.data.visibility === "PUBLIC" ? "Foto diperbarui dan tampil di galeri publik." : "Foto diperbarui (internal).");
}

export async function setDocumentVisibilityAction(id: string, visibility: "PUBLIC" | "INTERNAL"): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return fail(g.error);
  const { data, error } = await g.supabase.from("documents").update({ visibility }).eq("id", id).select("id");
  if (error) return fail(friendlyError(error));
  if (!data?.length) return fail("Anda tidak berhak mengubah foto ini.");
  revalidateBasecamp("/dokumentasi");
  return ok(visibility === "PUBLIC" ? "Foto tampil di galeri publik." : "Foto disembunyikan dari publik.");
}

export async function deleteDocumentAction(id: string): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return fail(g.error);
  const { data, error } = await g.supabase.from("documents").delete().eq("id", id).select("file_path");
  if (error) return fail(friendlyError(error));
  if (!data?.length) return fail("Anda tidak berhak menghapus foto ini.");
  await g.supabase.storage.from("documentation").remove([data[0].file_path as string]);
  revalidateBasecamp("/dokumentasi");
  return ok("Foto dihapus.");
}
