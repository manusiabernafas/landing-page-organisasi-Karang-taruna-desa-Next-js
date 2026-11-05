import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";

/** URL publik bucket media (cover event, foto barang). Path boleh sudah berupa URL penuh. */
export function mediaUrl(path: string | null | undefined) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/media/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Signed URL massal untuk bucket privat (dokumentasi, avatar, lampiran). */
export async function signedUrls(
  supabase: SupabaseClient,
  bucket: "documentation" | "avatars" | "attachments",
  paths: (string | null | undefined)[],
  expiresIn = 60 * 60,
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter((p): p is string => Boolean(p) && !/^https?:\/\//.test(p!))));
  const out: Record<string, string> = {};
  for (const p of paths) if (p && /^https?:\/\//.test(p)) out[p] = p;
  if (unique.length === 0) return out;
  const { data } = await supabase.storage.from(bucket).createSignedUrls(unique, expiresIn);
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  }
  return out;
}
