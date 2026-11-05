"use server";

import { z } from "zod";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { fail, friendlyError, ok, type ActionResult } from "./result";
import { guard, revalidateBasecamp, zodFieldErrors } from "./helpers";

const ROLES = ["SUPER_ADMIN", "PENGURUS", "BENDAHARA", "PANITIA", "ANGGOTA"] as const;

export async function updateMyProfileAction(input: { full_name: string }): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return fail(g.error);
  const name = input.full_name?.trim() ?? "";
  if (name.length < 2 || name.length > 120) return fail("Nama minimal 2 karakter.");
  const { error } = await g.supabase.from("profiles").update({ full_name: name }).eq("id", g.session.userId);
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok("Profil diperbarui.");
}

const passwordSchema = z
  .object({ password: z.string().min(8, "Password minimal 8 karakter.").max(72), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Konfirmasi password belum sama." });

export async function changePasswordAction(input: z.infer<typeof passwordSchema>): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return fail(g.error);
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Password belum valid.", zodFieldErrors(parsed.error));
  const { error } = await g.supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(/same/i.test(error.message) ? "Password baru tidak boleh sama dengan yang lama." : "Password belum berhasil diganti. Coba password lain.");
  return ok("Password berhasil diganti.");
}

const orgSchema = z.object({
  name: z.string().trim().min(3).max(120),
  tagline: z.string().trim().max(160).optional(),
  about: z.string().trim().max(2000).optional(),
  location: z.string().trim().min(3).max(200),
  strict_balance: z.boolean(),
  public_inventory_summary: z.boolean(),
});

export async function updateOrganizationAction(input: z.infer<typeof orgSchema>): Promise<ActionResult> {
  const g = await guard("settings.manage");
  if (!g.ok) return fail(g.error);
  const parsed = orgSchema.safeParse(input);
  if (!parsed.success) return fail("Periksa kembali isian organisasi.", zodFieldErrors(parsed.error));
  const v = parsed.data;
  const settings = { ...g.session.organization.settings, strict_balance: v.strict_balance, public_inventory_summary: v.public_inventory_summary };
  const { error } = await g.supabase
    .from("organizations")
    .update({ name: v.name, tagline: v.tagline || null, about: v.about || null, location: v.location, settings })
    .eq("id", g.session.organization.id);
  if (error) return fail(friendlyError(error));
  revalidateBasecamp("/transparansi");
  return ok("Pengaturan organisasi disimpan.");
}

export async function setUserRoleAction(profileId: string, role: string, memberId: string | null): Promise<ActionResult> {
  const g = await guard("settings.manage");
  if (!g.ok) return fail(g.error);
  if (!ROLES.includes(role as (typeof ROLES)[number])) return fail("Peran tidak valid.");
  if (profileId === g.session.userId && role !== "SUPER_ADMIN") return fail("Anda tidak dapat menurunkan peran sendiri.");
  const { data, error } = await g.supabase
    .from("profiles")
    .update({ role, member_id: memberId || null })
    .eq("id", profileId)
    .eq("organization_id", g.session.organization.id)
    .select("id");
  if (error) return fail(error.code === "23505" ? "Anggota itu sudah terhubung ke akun lain." : friendlyError(error));
  if (!data?.length) return fail("Pengguna tidak ditemukan.");
  revalidateBasecamp();
  return ok("Peran pengguna diperbarui.");
}

const newUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email belum benar."),
  full_name: z.string().trim().min(2, "Nama wajib diisi.").max(120),
  role: z.enum(ROLES),
  member_id: z.string().uuid().nullable().optional(),
  password: z.string().min(8, "Password sementara minimal 8 karakter.").max(72),
});

export async function createUserAction(input: z.infer<typeof newUserSchema>): Promise<ActionResult> {
  const g = await guard("settings.manage");
  if (!g.ok) return fail(g.error);
  if (!hasServiceRole()) return fail("SUPABASE_SERVICE_ROLE_KEY belum diatur di server, jadi akun baru belum bisa dibuat dari sini.");
  const parsed = newUserSchema.safeParse(input);
  if (!parsed.success) return fail("Periksa kembali isian pengguna.", zodFieldErrors(parsed.error));
  const v = parsed.data;
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email: v.email, password: v.password, email_confirm: true, user_metadata: { full_name: v.full_name } });
  if (error || !data.user) return fail(/already/i.test(error?.message ?? "") ? "Email ini sudah terdaftar." : "Akun belum berhasil dibuat.");
  const { error: pErr } = await admin
    .from("profiles")
    .upsert({ id: data.user.id, organization_id: g.session.organization.id, full_name: v.full_name, role: v.role, member_id: v.member_id || null }, { onConflict: "id" });
  if (pErr) {
    await admin.auth.admin.deleteUser(data.user.id);
    return fail(pErr.code === "23505" ? "Anggota itu sudah terhubung ke akun lain." : "Profil pengguna belum berhasil dibuat.");
  }
  // Audit ditulis lewat service role (user biasa tidak punya hak menulis audit log).
  await admin.from("audit_logs").insert({
    organization_id: g.session.organization.id,
    actor_id: g.session.userId,
    actor_name: g.session.profile.full_name,
    action: "CREATE",
    entity: "profiles",
    entity_id: data.user.id,
    summary: `${g.session.profile.full_name} membuat akun ${v.full_name} dengan peran ${v.role}.`,
  });
  revalidateBasecamp();
  return ok(`Akun ${v.email} dibuat. Minta pengguna mengganti password sementara setelah login pertama.`);
}
