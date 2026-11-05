"use server";

import { redirect } from "next/navigation";
import { committeeSchema, eventSchema, scheduleSchema, taskSchema, type CommitteeInput, type ScheduleInput, type TaskInput } from "@/lib/validations/events";
import { uploadFile, UploadError } from "@/lib/services/upload";
import { fromLocalInput, slugify } from "@/lib/utils/format";
import { fail, friendlyError, ok, type ActionResult } from "./result";
import { fileFrom, guard, parsePayload, revalidateBasecamp, zodFieldErrors } from "./helpers";
import type { EventStatus } from "@/types/db";

export async function saveEventAction(formData: FormData, id?: string): Promise<ActionResult<{ id: string }>> {
  const g = await guard();
  if (!g.ok) return fail(g.error);
  const { session, supabase } = g;
  const parsed = eventSchema.safeParse(parsePayload(formData));
  if (!parsed.success) return fail("Periksa kembali isian event.", zodFieldErrors(parsed.error));
  const v = parsed.data;

  let cover: string | undefined;
  const file = fileFrom(formData, "cover");
  if (file) {
    try {
      cover = (await uploadFile(supabase, "media", session.organization.id, "events", file)).path;
    } catch (e) {
      const msg = e instanceof UploadError ? e.message : "Cover belum berhasil diunggah.";
      return fail(msg, { cover: msg });
    }
  }

  const row = {
    name: v.name,
    kind: v.kind,
    description: v.description?.trim() || null,
    location: v.location?.trim() || null,
    start_date: fromLocalInput(v.start_date),
    end_date: fromLocalInput(v.end_date),
    status: v.status,
    budget: v.budget,
    target_participant: v.target_participant ?? null,
    actual_participant: v.actual_participant ?? null,
    is_public: v.status === "DRAFT" ? false : v.is_public,
    ...(cover ? { cover } : {}),
  };

  if (id) {
    const { data, error } = await supabase.from("events").update(row).eq("id", id).select("id,slug");
    if (error) return fail(friendlyError(error));
    if (!data?.length) return fail("Anda tidak berhak mengubah event ini.");
    revalidateBasecamp("/kegiatan", `/kegiatan/${data[0].slug}`);
    return ok("Event diperbarui.", { id });
  }

  const base = slugify(v.name) || "event";
  const { data: taken } = await supabase.from("events").select("slug").eq("organization_id", session.organization.id).like("slug", `${base}%`);
  const used = new Set(((taken ?? []) as { slug: string }[]).map((t) => t.slug));
  let slug = base;
  for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;

  const { data, error } = await supabase
    .from("events")
    .insert({ ...row, slug, organization_id: session.organization.id })
    .select("id")
    .single();
  if (error) return fail(friendlyError(error));
  revalidateBasecamp("/kegiatan");
  return ok("Event dibuat. Akun dana event otomatis disiapkan.", { id: data.id as string });
}

export async function setEventStatusAction(id: string, status: EventStatus): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return fail(g.error);
  const { data, error } = await g.supabase.from("events").update({ status }).eq("id", id).select("id");
  if (error) return fail(friendlyError(error));
  if (!data?.length) return fail("Anda tidak berhak mengubah event ini.");
  revalidateBasecamp("/kegiatan");
  return ok("Status event diperbarui.");
}

export async function deleteEventAction(id: string): Promise<ActionResult> {
  const g = await guard("event.delete");
  if (!g.ok) return fail(g.error);
  const { supabase } = g;
  const { count } = await supabase.from("finance_transactions").select("id", { count: "exact", head: true }).eq("event_id", id);
  if ((count ?? 0) > 0) return fail("Event ini sudah punya transaksi keuangan. Ubah status menjadi Dibatalkan agar riwayat tetap utuh.");
  const acc = await supabase.from("finance_accounts").delete().eq("event_id", id);
  if (acc.error) return fail(friendlyError(acc.error));
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return fail(friendlyError(error));
  revalidateBasecamp("/kegiatan");
  redirect("/dashboard/events?deleted=1");
}

/* ------------------------------- Quest -------------------------------- */
export async function addTaskAction(eventId: string, input: TaskInput): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return fail(g.error);
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return fail("Periksa kembali isian quest.", zodFieldErrors(parsed.error));
  const { data: last } = await g.supabase.from("event_tasks").select("sort_order").eq("event_id", eventId).order("sort_order", { ascending: false }).limit(1);
  const { error } = await g.supabase.from("event_tasks").insert({
    organization_id: g.session.organization.id,
    event_id: eventId,
    title: parsed.data.title,
    assignee_member_id: parsed.data.assignee_member_id || null,
    due_date: parsed.data.due_date || null,
    sort_order: ((last?.[0]?.sort_order as number | undefined) ?? 0) + 1,
  });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp();
  return ok("Quest ditambahkan.");
}

export async function toggleTaskAction(taskId: string, done: boolean): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return fail(g.error);
  const { data, error } = await g.supabase.from("event_tasks").update({ is_done: done }).eq("id", taskId).select("id");
  if (error) return fail(friendlyError(error));
  if (!data?.length) return fail("Anda tidak berhak mengubah quest event ini.");
  revalidateBasecamp();
  return ok(done ? "Quest selesai!" : "Quest dibuka kembali.");
}

export async function deleteTaskAction(taskId: string): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return fail(g.error);
  const { data, error } = await g.supabase.from("event_tasks").delete().eq("id", taskId).select("id");
  if (error) return fail(friendlyError(error));
  if (!data?.length) return fail("Anda tidak berhak menghapus quest ini.");
  revalidateBasecamp();
  return ok("Quest dihapus.");
}

/* ------------------------------ Jadwal -------------------------------- */
export async function addScheduleAction(eventId: string, input: ScheduleInput): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return fail(g.error);
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) return fail("Periksa kembali isian jadwal.", zodFieldErrors(parsed.error));
  const v = parsed.data;
  const { error } = await g.supabase.from("event_schedules").insert({
    organization_id: g.session.organization.id,
    event_id: eventId,
    title: v.title,
    start_at: fromLocalInput(v.start_at),
    end_at: v.end_at ? fromLocalInput(v.end_at) : null,
    location: v.location?.trim() || null,
    pic: v.pic?.trim() || null,
  });
  if (error) return fail(friendlyError(error));
  revalidateBasecamp("/kegiatan");
  return ok("Jadwal ditambahkan.");
}

export async function deleteScheduleAction(id: string): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return fail(g.error);
  const { data, error } = await g.supabase.from("event_schedules").delete().eq("id", id).select("id");
  if (error) return fail(friendlyError(error));
  if (!data?.length) return fail("Anda tidak berhak menghapus jadwal ini.");
  revalidateBasecamp("/kegiatan");
  return ok("Jadwal dihapus.");
}

/* ------------------------------ Panitia ------------------------------- */
export async function addCommitteeAction(eventId: string, input: CommitteeInput): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return fail(g.error);
  const parsed = committeeSchema.safeParse(input);
  if (!parsed.success) return fail("Periksa kembali isian panitia.", zodFieldErrors(parsed.error));
  const { error } = await g.supabase.from("event_members").insert({
    organization_id: g.session.organization.id,
    event_id: eventId,
    member_id: parsed.data.member_id,
    committee_role: parsed.data.committee_role,
    division: parsed.data.division?.trim() || null,
  });
  if (error) return fail(error.code === "23505" ? "Anggota ini sudah menjadi panitia event." : friendlyError(error));
  revalidateBasecamp();
  return ok("Panitia ditambahkan.");
}

export async function removeCommitteeAction(id: string): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return fail(g.error);
  const { data, error } = await g.supabase.from("event_members").delete().eq("id", id).select("id");
  if (error) return fail(friendlyError(error));
  if (!data?.length) return fail("Anda tidak berhak mengubah panitia event ini.");
  revalidateBasecamp();
  return ok("Panitia dihapus dari event.");
}
