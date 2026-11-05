import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { UPLOAD_LIMITS } from "@/lib/config";

type Bucket = "media" | "documentation" | "avatars" | "attachments";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Cek magic bytes agar file tidak sekadar berganti ekstensi. */
function sniff(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50)
    return "image/webp";
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "application/pdf";
  return null;
}

export class UploadError extends Error {}

export async function validateFile(file: File, opts: { allowPdf?: boolean; maxBytes?: number } = {}) {
  const max = opts.maxBytes ?? UPLOAD_LIMITS.imageMaxBytes;
  const allowed: readonly string[] = opts.allowPdf ? UPLOAD_LIMITS.attachmentMimes : UPLOAD_LIMITS.imageMimes;
  if (!(file instanceof File) || file.size === 0) throw new UploadError("File belum dipilih.");
  if (file.size > max) throw new UploadError(`Ukuran file maksimal ${Math.round(max / 1024 / 1024)} MB.`);
  const buf = new Uint8Array(await file.arrayBuffer());
  const real = sniff(buf.subarray(0, 16));
  if (!real || !allowed.includes(real) || (file.type && file.type !== real)) {
    throw new UploadError(opts.allowPdf ? "Format file harus JPG, PNG, WEBP, atau PDF." : "Format gambar harus JPG, PNG, atau WEBP.");
  }
  return { bytes: buf, mime: real, size: file.size };
}

export async function uploadFile(
  supabase: SupabaseClient,
  bucket: Bucket,
  orgId: string,
  folder: string,
  file: File,
  opts: { allowPdf?: boolean; maxBytes?: number } = {},
) {
  const { bytes, mime, size } = await validateFile(file, opts);
  const path = `${orgId}/${folder}/${randomUUID()}.${EXT[mime]}`;
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: mime, upsert: false });
  if (error) throw new UploadError("File belum berhasil diunggah. Coba lagi.");
  return { path, mime, size };
}
