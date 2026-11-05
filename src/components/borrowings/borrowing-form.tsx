"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Minus, Plus, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { createBorrowingAction } from "@/lib/actions/borrowings";
import { cn } from "@/lib/utils/cn";

export interface UnitGroup {
  id: string;
  name: string;
  unit_label: string;
  units: { id: string; code: string; condition: string }[];
}

export function BorrowingForm({
  groups,
  members,
  events,
  canApprove,
  defaults,
}: {
  groups: UnitGroup[];
  members: { id: string; name: string }[];
  events: { id: string; name: string }[];
  canApprove: boolean;
  defaults: { borrow_date: string; expected_return_date: string; event_id?: string; unitIds?: string[]; openItem?: string };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set(defaults.unitIds ?? []));
  const [open, setOpen] = useState<string | null>(defaults.openItem ?? null);
  const [filter, setFilter] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    borrower_member_id: "",
    borrower_name: "",
    borrower_phone: "",
    purpose: "",
    event_id: defaults.event_id ?? "",
    borrow_date: defaults.borrow_date,
    expected_return_date: defaults.expected_return_date,
    notes: "",
    auto_approve: canApprove,
  });
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const shown = useMemo(() => groups.filter((g) => g.name.toLowerCase().includes(filter.toLowerCase())), [groups, filter]);
  const summary = groups
    .map((g) => ({ g, n: g.units.filter((u) => selected.has(u.id)).length }))
    .filter((x) => x.n > 0);

  function setCount(g: UnitGroup, n: number) {
    const next = new Set(selected);
    g.units.forEach((u) => next.delete(u.id));
    g.units.slice(0, Math.max(0, Math.min(n, g.units.length))).forEach((u) => next.add(u.id));
    setSelected(next);
  }
  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.borrower_name.trim().length < 2) errs.borrower_name = "Nama peminjam wajib diisi.";
    if (form.purpose.trim().length < 3) errs.purpose = "Keperluan wajib diisi.";
    if (form.expected_return_date < form.borrow_date) errs.expected_return_date = "Tanggal kembali tidak boleh sebelum tanggal pinjam.";
    if (selected.size === 0) errs.unit_ids = "Pilih minimal satu unit barang.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    start(async () => {
      const res = await createBorrowingAction({
        ...form,
        borrower_member_id: form.borrower_member_id || null,
        event_id: form.event_id || null,
        unit_ids: Array.from(selected),
      });
      if (res.ok) {
        toast.success(res.message);
        router.push(`/dashboard/borrowings/${res.data?.id}`);
        router.refresh();
      } else {
        toast.error(res.error);
        setErrors(res.fieldErrors ?? {});
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 pb-24 lg:grid-cols-[1fr_380px] lg:pb-0">
      <div className="space-y-5 [&>*]:min-w-0">
        <section className="space-y-4 rounded-card border border-border bg-surface p-4 sm:p-5">
          <h2 className="font-display font-bold">Peminjam</h2>
          <Field label="Anggota Pemuda RW 05 (opsional)" htmlFor="member" hint="Pilih bila peminjamnya anggota. Untuk warga umum, kosongkan dan isi nama di bawah.">
            <Select
              id="member"
              value={form.borrower_member_id}
              onChange={(e) => {
                const m = members.find((x) => x.id === e.target.value);
                setForm((f) => ({ ...f, borrower_member_id: e.target.value, borrower_name: m ? m.name : f.borrower_name }));
              }}
            >
              <option value="">Warga / bukan anggota</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama peminjam" htmlFor="bname" error={errors.borrower_name} required>
              <Input id="bname" value={form.borrower_name} onChange={(e) => set("borrower_name", e.target.value)} placeholder="Contoh: Pak Suharno (RT 03)" aria-invalid={Boolean(errors.borrower_name)} />
            </Field>
            <Field label="Nomor HP" htmlFor="bphone" error={errors.borrower_phone} hint="Hanya terlihat pengurus.">
              <Input id="bphone" inputMode="tel" value={form.borrower_phone} onChange={(e) => set("borrower_phone", e.target.value)} />
            </Field>
          </div>
          <Field label="Keperluan" htmlFor="purpose" error={errors.purpose} required>
            <Input id="purpose" value={form.purpose} onChange={(e) => set("purpose", e.target.value)} placeholder="Contoh: Hajatan pernikahan" aria-invalid={Boolean(errors.purpose)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Untuk event" htmlFor="event">
              <Select id="event" value={form.event_id} onChange={(e) => set("event_id", e.target.value)}>
                <option value="">Tidak terkait event</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tanggal pinjam" htmlFor="bdate" required>
              <Input id="bdate" type="date" value={form.borrow_date} onChange={(e) => set("borrow_date", e.target.value)} />
            </Field>
            <Field label="Rencana kembali" htmlFor="rdate" error={errors.expected_return_date} required>
              <Input id="rdate" type="date" value={form.expected_return_date} min={form.borrow_date} onChange={(e) => set("expected_return_date", e.target.value)} />
            </Field>
          </div>
          <Field label="Catatan" htmlFor="notes">
            <Textarea id="notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </section>

        <section className="rounded-card border border-border bg-surface">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="font-display font-bold">Pilih barang</h2>
              <p className="text-xs text-muted">Hanya unit berstatus Tersedia yang bisa dipinjam.</p>
            </div>
            <div className="relative sm:w-60">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden />
              <Input aria-label="Cari barang" placeholder="Cari barang…" className="pl-9" value={filter} onChange={(e) => setFilter(e.target.value)} />
            </div>
          </div>
          {errors.unit_ids ? (
            <p role="alert" className="mx-4 mt-3 rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger sm:mx-5">
              {errors.unit_ids}
            </p>
          ) : null}
          {shown.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">Tidak ada barang tersedia saat ini.</p>
          ) : (
            <ul className="divide-y divide-border">
              {shown.map((g) => {
                const count = g.units.filter((u) => selected.has(u.id)).length;
                const isOpen = open === g.id;
                return (
                  <li key={g.id} className="p-4 sm:px-5">
                    <div className="flex items-center gap-3">
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen(isOpen ? null : g.id)} aria-expanded={isOpen}>
                        <p className="truncate font-semibold">{g.name}</p>
                        <p className="text-xs text-muted">
                          {g.units.length} {g.unit_label} tersedia · {isOpen ? "sembunyikan unit" : "pilih unit spesifik"}
                        </p>
                      </button>
                      <div className="flex items-center gap-1 rounded-xl border border-border bg-bg-soft p-1">
                        <button type="button" onClick={() => setCount(g, count - 1)} disabled={count === 0} className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-surface disabled:opacity-40" aria-label={`Kurangi ${g.name}`}>
                          <Minus className="size-4" />
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={g.units.length}
                          value={count}
                          onChange={(e) => setCount(g, Number(e.target.value) || 0)}
                          className="w-11 bg-transparent text-center font-bold tabular focus:outline-none"
                          aria-label={`Jumlah ${g.name}`}
                        />
                        <button type="button" onClick={() => setCount(g, count + 1)} disabled={count >= g.units.length} className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-surface disabled:opacity-40" aria-label={`Tambah ${g.name}`}>
                          <Plus className="size-4" />
                        </button>
                      </div>
                    </div>
                    {isOpen ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {g.units.map((u) => {
                          const on = selected.has(u.id);
                          return (
                            <button
                              key={u.id}
                              type="button"
                              aria-pressed={on}
                              onClick={() => toggle(u.id)}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 font-mono text-xs font-bold transition-colors",
                                on ? "border-grass bg-grass text-white dark:text-forest" : "border-border bg-surface hover:border-grass",
                              )}
                            >
                              {on ? <Check className="size-3" aria-hidden /> : null}
                              {u.code}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-surface/95 p-3 backdrop-blur lg:static lg:rounded-card lg:border lg:p-5">
          <p className="hidden font-display font-bold lg:block">Ringkasan</p>
          {summary.length === 0 ? (
            <p className="hidden text-sm text-muted lg:mt-2 lg:block">Belum ada barang dipilih.</p>
          ) : (
            <ul className="hidden space-y-1 text-sm lg:mt-2 lg:block">
              {summary.map(({ g, n }) => (
                <li key={g.id} className="flex justify-between gap-2">
                  <span className="truncate">{g.name}</span>
                  <span className="font-bold tabular">
                    {n} {g.unit_label}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {canApprove ? (
            <Checkbox className="mb-3 lg:mt-4" label="Langsung setujui (saya pengurus)" checked={form.auto_approve} onChange={(e) => set("auto_approve", e.target.checked)} />
          ) : null}
          <Button type="submit" size="lg" className="w-full" loading={pending}>
            {!pending ? <Send /> : null} Ajukan {selected.size ? `${selected.size} unit` : "peminjaman"}
          </Button>
        </div>
      </aside>
    </form>
  );
}
