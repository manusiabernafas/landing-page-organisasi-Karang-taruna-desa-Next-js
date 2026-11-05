"use server";

import { fail, friendlyError, ok, type ActionResult } from "./result";
import { guard, revalidateBasecamp } from "./helpers";

export async function markNotificationAction(id: string, read: boolean): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return fail(g.error);
  const { error } = await g.supabase.from("notifications").update({ is_read: read }).eq("id", id).eq("user_id", g.session.userId);
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok();
}

export async function markAllReadAction(): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return fail(g.error);
  const { error } = await g.supabase.from("notifications").update({ is_read: true }).eq("user_id", g.session.userId).eq("is_read", false);
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok("Semua notifikasi ditandai sudah dibaca.");
}

export async function clearReadNotificationsAction(): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return fail(g.error);
  const { error } = await g.supabase.from("notifications").delete().eq("user_id", g.session.userId).eq("is_read", true);
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok("Notifikasi yang sudah dibaca dibersihkan.");
}
