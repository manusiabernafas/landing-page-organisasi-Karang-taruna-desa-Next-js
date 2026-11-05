"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { REMEMBER_COOKIE } from "@/lib/supabase/cookies";
import { forgotSchema, loginSchema, resetSchema } from "@/lib/validations/auth";
import { fail, ok, type ActionResult } from "./result";
import { SITE_URL } from "@/lib/config";

function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function loginAction(input: { email: string; password: string; remember: boolean; next?: string }): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail("Periksa kembali email dan password.");
  const jar = await cookies();
  if (parsed.data.remember) jar.delete(REMEMBER_COOKIE);
  else jar.set(REMEMBER_COOKIE, "0", { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error || !data.user) {
    return fail(error?.message === "Email not confirmed" ? "Email belum dikonfirmasi. Cek kotak masuk Anda." : "Email atau password belum cocok.");
  }
  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", data.user.id).maybeSingle();
  if (!profile?.organization_id) {
    await supabase.auth.signOut();
    return fail("Akun Anda belum dihubungkan ke Pemuda RW 05. Hubungi Super Admin basecamp.");
  }
  redirect(safeNext(input.next));
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(REMEMBER_COOKIE);
  redirect("/login?keluar=1");
}

export async function forgotPasswordAction(input: { email: string }): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Email belum valid.");
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
  });
  // Selalu sukses agar tidak membocorkan email mana yang terdaftar.
  return ok("Jika email terdaftar, tautan atur ulang password sudah dikirim.");
}

export async function resetPasswordAction(input: { password: string; confirm: string }): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Password belum valid.");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Tautan sudah kedaluwarsa. Minta tautan baru dari halaman lupa password.");
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail("Password belum berhasil diganti. Coba password lain.");
  return ok("Password berhasil diganti.");
}
