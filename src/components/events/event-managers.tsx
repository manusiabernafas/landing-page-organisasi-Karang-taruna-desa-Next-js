"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, MapPin, Plus, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form";
import { Avatar } from "@/components/ui/avatar";
import { addCommitteeAction, addScheduleAction, deleteScheduleAction, removeCommitteeAction, setEventStatusAction } from "@/lib/actions/events";
import { EVENT_STATUS, MEMBER_ROLE } from "@/lib/utils/labels";
import type { EventSchedule, EventStatus, MemberRole } from "@/types/db";

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, onOk?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        if (res.message) toast.success(res.message);
        onOk?.();
        router.refresh();
      } else toast.error(res.error ?? "Belum berhasil. Coba lagi.");
    });
  return { pending, run };
}

/* ------------------------------ Status ------------------------------- */
export function EventStatusControl({ eventId, status }: { eventId: string; status: EventStatus }) {
  const { pending, run } = useAction();
  return (
    <label className="flex items-center gap-2 text-sm font-semibold">
      <span className="sr-only sm:not-sr-only">Status</span>
      <select
        className="h-10 rounded-xl border border-border-strong bg-surface px-3 text-sm font-semibold"
        value={status}
        disabled={pending}
        onChange={(e) => run(() => setEventStatusAction(eventId, e.target.value as EventStatus))}
        aria-label="Ubah status event"
      >
        {Object.entries(EVENT_STATUS).map(([k, v]) => (
          <option key={k} value={k}>
            {v.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ------------------------------ Jadwal ------------------------------- */
function toTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
function toDay(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
}

export function ScheduleManager({ eventId, schedules, canManage, defaultDate }: { eventId: string; schedules: EventSchedule[]; canManage: boolean; defaultDate: string }) {
  const { pending, run } = useAction();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", start_at: `${defaultDate}T19:00`, end_at: "", location: "", pic: "" });
  const [err, setErr] = useState<string | null>(null);
  const groups = new Map<string, EventSchedule[]>();
  for (const s of schedules) groups.set(toDay(s.start_at), [...(groups.get(toDay(s.start_at)) ?? []), s]);

  return (
    <div className="space-y-4">
      {canManage ? (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <Plus /> Tambah jadwal
        </Button>
      ) : null}
      {schedules.length === 0 ? (
        <p className="rounded-card border border-dashed border-border-strong bg-surface-2 px-5 py-8 text-center text-sm text-muted">Belum ada rundown acara.</p>
      ) : (
        Array.from(groups.entries()).map(([day, list]) => (
          <section key={day}>
            <h3 className="mb-2 text-sm font-bold text-muted capitalize">{day}</h3>
            <ol className="relative space-y-2 border-l-2 border-grass/30 pl-5">
              {list.map((s) => (
                <li key={s.id} className="relative rounded-2xl border border-border bg-surface p-4">
                  <span className="absolute top-5 -left-[27px] size-3 rounded-full bg-grass ring-4 ring-bg" aria-hidden />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-bold text-grass-600 tabular">
                        <Clock className="size-3.5" aria-hidden /> {toTime(s.start_at)}
                        {s.end_at ? `–${toTime(s.end_at)}` : ""} WIB
                      </p>
                      <p className="mt-0.5 font-semibold">{s.title}</p>
                      <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
                        {s.location ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" aria-hidden /> {s.location}
                          </span>
                        ) : null}
                        {s.pic ? (
                          <span className="inline-flex items-center gap-1">
                            <User className="size-3" aria-hidden /> {s.pic}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    {canManage ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => confirm(`Hapus jadwal "${s.title}"?`) && run(() => deleteScheduleAction(s.id))}
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-subtle hover:bg-danger-bg hover:text-danger"
                        aria-label={`Hapus jadwal ${s.title}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))
      )}
      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Tambah jadwal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              loading={pending}
              onClick={() => {
                setErr(null);
                if (form.title.trim().length < 2) return setErr("Judul acara wajib diisi.");
                if (form.end_at && form.end_at < form.start_at) return setErr("Jam selesai tidak boleh sebelum jam mulai.");
                run(() => addScheduleAction(eventId, form), () => {
                  setOpen(false);
                  setForm((f) => ({ ...f, title: "", pic: "" }));
                });
              }}
            >
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {err ? (
            <p role="alert" className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">
              {err}
            </p>
          ) : null}
          <Field label="Nama acara" htmlFor="sch-title" required>
            <Input id="sch-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: Pembukaan & sambutan" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mulai" htmlFor="sch-start" required>
              <Input id="sch-start" type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
            </Field>
            <Field label="Selesai" htmlFor="sch-end">
              <Input id="sch-end" type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Lokasi" htmlFor="sch-loc">
              <Input id="sch-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Field>
            <Field label="Penanggung jawab" htmlFor="sch-pic">
              <Input id="sch-pic" value={form.pic} onChange={(e) => setForm({ ...form, pic: e.target.value })} />
            </Field>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

/* ------------------------------ Panitia ------------------------------ */
export function CommitteeManager({
  eventId,
  committee,
  members,
  canManage,
}: {
  eventId: string;
  committee: { id: string; committee_role: string; division: string | null; member: { id: string; name: string; nickname: string | null; photo: string | null; role: MemberRole } | null }[];
  members: { id: string; name: string }[];
  canManage: boolean;
}) {
  const { pending, run } = useAction();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ member_id: "", committee_role: "", division: "" });
  const divisions = new Map<string, typeof committee>();
  for (const c of committee) divisions.set(c.division ?? "Lainnya", [...(divisions.get(c.division ?? "Lainnya") ?? []), c]);
  const taken = new Set(committee.map((c) => c.member?.id));

  return (
    <div className="space-y-4">
      {canManage ? (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <Plus /> Tambah panitia
        </Button>
      ) : null}
      {committee.length === 0 ? (
        <p className="rounded-card border border-dashed border-border-strong bg-surface-2 px-5 py-8 text-center text-sm text-muted">Belum ada panitia. Bentuk tim dulu, quest jadi lebih ringan.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from(divisions.entries()).map(([div, list]) => (
            <section key={div} className="rounded-card border border-border bg-surface">
              <h3 className="border-b border-border px-4 py-2.5 text-xs font-bold tracking-wider text-muted uppercase">Seksi {div}</h3>
              <ul className="divide-y divide-border">
                {list.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={c.member?.name ?? "?"} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{c.member?.name}</p>
                      <p className="text-xs text-muted">
                        {c.committee_role} · {c.member ? MEMBER_ROLE[c.member.role] : ""}
                      </p>
                    </div>
                    {canManage ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => confirm(`Keluarkan ${c.member?.name} dari panitia?`) && run(() => removeCommitteeAction(c.id))}
                        className="inline-flex size-8 items-center justify-center rounded-lg text-subtle hover:bg-danger-bg hover:text-danger"
                        aria-label={`Keluarkan ${c.member?.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Tambah panitia"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              loading={pending}
              disabled={!form.member_id || form.committee_role.trim().length < 2}
              onClick={() => run(() => addCommitteeAction(eventId, form), () => { setOpen(false); setForm({ member_id: "", committee_role: "", division: "" }); })}
            >
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Anggota" htmlFor="cm-member" required>
            <Select id="cm-member" value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })}>
              <option value="">Pilih anggota…</option>
              {members
                .filter((m) => !taken.has(m.id))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Peran panitia" htmlFor="cm-role" required>
            <Input id="cm-role" placeholder="Contoh: Koordinator Konsumsi" value={form.committee_role} onChange={(e) => setForm({ ...form, committee_role: e.target.value })} />
          </Field>
          <Field label="Seksi / divisi" htmlFor="cm-div">
            <Input id="cm-div" placeholder="Contoh: Konsumsi" value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })} />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
