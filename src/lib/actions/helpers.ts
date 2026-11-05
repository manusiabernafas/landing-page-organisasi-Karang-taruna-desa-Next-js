import "server-only";
import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import { getSession, type Session } from "@/lib/auth";
import { can, type Permission } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

type Guarded =
  | { ok: false; error: string }
  | { ok: true; session: Session; supabase: Awaited<ReturnType<typeof createClient>> };

/** Pastikan user login + punya izin. Otorisasi final tetap di RLS/fungsi DB. */
export async function guard(permission?: Permission): Promise<Guarded> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sesi Anda berakhir. Silakan masuk kembali." };
  if (permission && !can(session.profile.role, permission)) {
    return { ok: false, error: "Peran Anda belum punya izin untuk aksi ini." };
  }
  const supabase = await createClient();
  return { ok: true, session, supabase };
}

export function zodFieldErrors(error: ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function revalidateBasecamp(...extra: string[]) {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/");
  for (const p of extra) revalidatePath(p);
}

export function parsePayload<T = unknown>(formData: FormData): T | null {
  const raw = formData.get("payload");
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function fileFrom(formData: FormData, key: string): File | null {
  const f = formData.get(key);
  return f instanceof File && f.size > 0 ? f : null;
}
