import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/config";
import { REMEMBER_COOKIE, stripPersistence } from "./cookies";
import WebSocket from "ws";

/**
 * Supabase client untuk Server Components, Server Actions, dan Route Handlers.
 * Selalu memakai anon key + sesi user (cookie) sehingga RLS berlaku.
 */
export async function createClient() {
  // Baca cookie dulu: halaman yang memakai client ini otomatis dinamis,
  // jadi build tidak mencoba prerender (dan gagal) saat env belum diisi.
  const cookieStore = await cookies();
  if (!isSupabaseConfigured()) {
    throw new SupabaseNotConfiguredError();
  }
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // Node 20 belum punya WebSocket bawaan; realtime-js membutuhkannya saat inisialisasi.
    realtime: { transport: WebSocket as never },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          const sessionOnly = cookieStore.get(REMEMBER_COOKIE)?.value === "0";
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, sessionOnly ? stripPersistence(options) : options));
        } catch {
          // Dipanggil dari Server Component: refresh sesi ditangani proxy.
        }
      },
    },
  });
}

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    this.name = "SupabaseNotConfiguredError";
  }
}
