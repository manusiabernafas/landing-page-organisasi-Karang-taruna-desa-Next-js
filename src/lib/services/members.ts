import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "./storage";
import type { Member, MemberPrivate } from "@/types/db";

export async function listMembers(orgId: string, opts: { q?: string; role?: string; status?: string; page: number; pageSize: number }) {
  const supabase = await createClient();
  let q = supabase.from("members").select("*", { count: "exact" }).eq("organization_id", orgId);
  q = q.eq("status", opts.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
  if (opts.role && ["KETUA", "WAKIL", "SEKRETARIS", "BENDAHARA", "KOORDINATOR", "ANGGOTA"].includes(opts.role)) q = q.eq("role", opts.role);
  if (opts.q) {
    const term = opts.q.replace(/[%,()*]/g, " ").trim();
    if (term) q = q.or(`name.ilike.%${term}%,nickname.ilike.%${term}%`);
  }
  const from = (opts.page - 1) * opts.pageSize;
  const roleOrder = "role";
  const { data, count, error } = await q.order(roleOrder).order("name").range(from, from + opts.pageSize - 1);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Member[];
  const urls = await signedUrls(supabase, "avatars", rows.map((m) => m.photo));
  return { total: count ?? 0, items: rows.map((m) => ({ ...m, photoUrl: m.photo ? urls[m.photo] ?? null : null })) };
}

export async function getMemberProfile(id: string) {
  const supabase = await createClient();
  const { data: m } = await supabase.from("members").select("*").eq("id", id).maybeSingle<Member>();
  if (!m) return null;
  const [priv, committees, tasks, account] = await Promise.all([
    supabase.from("member_private").select("member_id,phone,address").eq("member_id", id).maybeSingle<MemberPrivate>(),
    supabase.from("event_members").select("id,committee_role,division,event:events(id,name,status,start_date)").eq("member_id", id).order("created_at", { ascending: false }),
    supabase.from("event_tasks").select("id,is_done").eq("assignee_member_id", id),
    supabase.from("profiles").select("role").eq("member_id", id).maybeSingle(),
  ]);
  const urls = await signedUrls(supabase, "avatars", [m.photo]);
  type C = { id: string; committee_role: string; division: string | null; event: { id: string; name: string; status: string; start_date: string } | null };
  const t = (tasks.data ?? []) as { is_done: boolean }[];
  return {
    member: { ...m, photoUrl: m.photo ? urls[m.photo] ?? null : null },
    contact: priv.data ?? null,
    committees: ((committees.data ?? []) as unknown as C[]).filter((c) => c.event),
    tasksDone: t.filter((x) => x.is_done).length,
    tasksTotal: t.length,
    appRole: (account.data as { role: string } | null)?.role ?? null,
  };
}
