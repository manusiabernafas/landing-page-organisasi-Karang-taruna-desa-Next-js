import "server-only";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { SUPABASE_URL } from "@/lib/config";

/**
 * Client service-role. HANYA untuk operasi admin di server (membuat akun pengguna).
 * Kunci dibaca dari SUPABASE_SERVICE_ROLE_KEY (tanpa prefix NEXT_PUBLIC) sehingga
 * tidak pernah ikut ke bundle browser.
 */
export function hasServiceRole() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && SUPABASE_URL);
}

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY belum diatur di server.");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: WebSocket as never } });
}
