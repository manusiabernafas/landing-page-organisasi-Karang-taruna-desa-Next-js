"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Flag, Plus, Sparkles, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { addTaskAction, deleteTaskAction, toggleTaskAction } from "@/lib/actions/events";
import { cn } from "@/lib/utils/cn";
import type { EventTask } from "@/types/db";

function fmtDue(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function QuestBoard({
  eventName,
  eventId,
  tasks,
  members,
  canManage,
}: {
  eventName: string;
  eventId: string;
  tasks: EventTask[];
  members: { id: string; name: string; nickname: string | null }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(tasks, (state, change: { id: string; done: boolean }) =>
    state.map((t) => (t.id === change.id ? { ...t, is_done: change.done } : t)),
  );
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState("");
  const done = optimistic.filter((t) => t.is_done).length;
  const total = optimistic.length;
  const pctDone = total ? Math.round((done / total) * 100) : 0;
  const memberName = new Map(members.map((m) => [m.id, m.nickname ?? m.name.split(" ")[0]]));

  function toggle(t: EventTask) {
    if (!canManage) return;
    start(async () => {
      setOptimistic({ id: t.id, done: !t.is_done });
      const res = await toggleTaskAction(t.id, !t.is_done);
      if (res.ok) {
        if (!t.is_done && done + 1 === total) toast.success("Semua quest selesai! Event siap digelar.");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return toast.error("Judul quest minimal 2 karakter.");
    start(async () => {
      const res = await addTaskAction(eventId, { title, assignee_member_id: assignee || null, due_date: due || null });
      if (res.ok) {
        setTitle("");
        setAssignee("");
        setDue("");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function remove(t: EventTask) {
    if (!confirm(`Hapus quest "${t.title}"?`)) return;
    start(async () => {
      const res = await deleteTaskAction(t.id);
      if (res.ok) router.refresh();
      else toast.error(res.error);
    });
  }

  return (
    <section aria-labelledby="quest-title" className="overflow-hidden rounded-card border border-border bg-surface">
      <div className="bg-forest p-5 text-white sm:p-6">
        <p className="flex items-center gap-2 text-[11px] font-extrabold tracking-[0.18em] text-gold uppercase">
          <Flag className="size-3.5" aria-hidden /> Quest
        </p>
        <h2 id="quest-title" className="mt-1 font-display text-xl font-extrabold tracking-wide uppercase sm:text-2xl">
          {eventName}
        </h2>
        <div className="mt-4 flex items-end justify-between gap-3">
          <p className="text-sm text-[#b9cbb8] tabular">
            {done} dari {total} quest selesai
          </p>
          <p className="font-display text-3xl font-extrabold tabular">{pctDone}%</p>
        </div>
        <div className="mt-2 rounded-full bg-white/10 p-1">
          <Progress value={pctDone} tone="gold" size="lg" segmented className="bg-transparent ring-0" label="Progress quest" />
        </div>
      </div>

      {total === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">Belum ada quest. Tambahkan langkah persiapan pertama, misalnya &ldquo;Tentukan lokasi&rdquo;.</p>
      ) : (
        <ul className="divide-y divide-border">
          {optimistic.map((t) => (
            <li key={t.id} className={cn("group flex items-center gap-3 px-4 py-3 sm:px-5", t.is_done && "bg-surface-2")}>
              <button
                type="button"
                role="checkbox"
                aria-checked={t.is_done}
                aria-label={t.title}
                disabled={!canManage}
                onClick={() => toggle(t)}
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
                  t.is_done ? "border-grass bg-grass text-white dark:text-forest" : "border-border-strong bg-surface hover:border-grass",
                  !canManage && "cursor-default",
                )}
              >
                {t.is_done ? <Check className="size-4" strokeWidth={3} /> : null}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("text-[15px] font-semibold", t.is_done && "text-muted line-through decoration-2")}>{t.title}</p>
                <p className="flex flex-wrap gap-x-3 text-xs text-muted">
                  {t.assignee_member_id ? (
                    <span className="inline-flex items-center gap-1">
                      <User className="size-3" aria-hidden /> {memberName.get(t.assignee_member_id) ?? "Panitia"}
                    </span>
                  ) : null}
                  {t.due_date ? <span>Tenggat {fmtDue(t.due_date)}</span> : null}
                </p>
              </div>
              {t.is_done ? <Sparkles className="size-4 shrink-0 text-gold-600" aria-hidden /> : null}
              {canManage ? (
                <button
                  type="button"
                  onClick={() => remove(t)}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-subtle opacity-100 hover:bg-danger-bg hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                  aria-label={`Hapus quest ${t.title}`}
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <form onSubmit={add} className="grid gap-2 border-t border-border bg-surface-2 p-4 sm:grid-cols-[1fr_170px_150px_auto]">
          <label htmlFor="new-quest" className="sr-only">
            Quest baru
          </label>
          <Input id="new-quest" placeholder="Tambah quest, misal: Pesan konsumsi" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          <Select aria-label="Penanggung jawab" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Penanggung jawab</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
          <Input type="date" aria-label="Tenggat" value={due} onChange={(e) => setDue(e.target.value)} />
          <Button type="submit" loading={pending}>
            {!pending ? <Plus /> : null} Tambah
          </Button>
        </form>
      ) : null}
    </section>
  );
}
