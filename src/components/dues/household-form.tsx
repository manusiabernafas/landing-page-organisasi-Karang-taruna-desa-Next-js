"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { saveHouseholdAction, type HouseholdInput } from "@/lib/actions/dues";
import { cn } from "@/lib/utils/cn";

const fmt = new Intl.NumberFormat("id-ID");

export function HouseholdForm({
  editId,
  defaults,
  members,
}: {
  editId?: string;
  defaults: HouseholdInput;
  members: { id: string; name: string; status: string; household_id: string | null; household_name: string | null }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState(defaults);
  const [filter, setFilter] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const chosen = new Set(v.member_ids);
  const shown = useMemo(
    () => members.filter((m) => m.status === "ACTIVE" || chosen.has(m.id)).filter((m) => m.name.toLowerCase().includes(filter.toLowerCase())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members, filter, v.member_ids],
  );

  function toggle(id: string) {
    setV((x) => ({ ...x, member_ids: x.member_ids.includes(id) ? x.member_ids.filter((m) => m !== id) : [...x.member_ids, id] }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (v.name.trim().length < 2) errs.name = "Nama tagihan wajib diisi.";
    if (v.member_ids.length === 0) errs.member_ids = "Pilih minimal satu anggota.";
    setErr(errs);
    if (Object.keys(errs).length) return;
    const moved = members.filter((m) => v.member_ids.includes(m.id) && m.household_id && m.household_id !== editId);
    if (moved.length && !confirm(`${moved.map((m) => `${m.name} (dari ${m.household_name})`).join(", ")} akan dipindah ke tagihan ini. Lanjutkan?`)) return;
    start(async () => {
      const res = await saveHouseholdAction(v, editId);
      if (res.ok) {
        toast.success(res.message);
        router.push(`/dashboard/dues/households/${res.data?.id ?? editId}`);
        router.refresh();
      } else {
        toast.error(res.error);
        setErr(res.fieldErrors ?? {});
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5 pb-20 sm:pb-0">
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <Field label="Nama tagihan / rumah" htmlFor="h-name" error={err.name} required hint="Contoh: Keluarga Setiawan (Bagas & Oki), atau nama anggota bila sendiri.">
          <Input id="h-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <Field label="Iuran per bulan (Rp)" htmlFor="h-fee" required hint="Berlaku untuk tagihan bulan berikutnya.">
          <Input id="h-fee" inputMode="numeric" className="tabular" value={fmt.format(v.monthly_fee)} onChange={(e) => setV({ ...v, monthly_fee: Number(e.target.value.replace(/[^\d]/g, "").slice(0, 8)) || 0 })} />
        </Field>
      </div>
      <Field label="Alamat rumah" htmlFor="h-addr" hint="Dipakai juga sebagai lokasi bila rumah ini jadi tuan rumah rapat.">
        <Input id="h-addr" value={v.address ?? ""} onChange={(e) => setV({ ...v, address: e.target.value })} placeholder="Kwarasan RT 0x/RW 05" />
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">
          Anggota dalam tagihan ini <span className="text-danger">*</span>
        </legend>
        {v.member_ids.length ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {v.member_ids.map((id) => {
              const m = members.find((x) => x.id === id);
              return (
                <button key={id} type="button" onClick={() => toggle(id)} className="inline-flex items-center gap-1 rounded-full bg-grass px-3 py-1 text-sm font-semibold text-white dark:text-forest">
                  {m?.name} <X className="size-3.5" aria-label={`Keluarkan ${m?.name}`} />
                </button>
              );
            })}
          </div>
        ) : null}
        {err.member_ids ? (
          <p role="alert" className="mb-2 text-sm text-danger">
            {err.member_ids}
          </p>
        ) : null}
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <Input aria-label="Cari anggota" placeholder="Cari anggota…" className="pl-9" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-xl border border-border">
          {shown.map((m) => {
            const on = chosen.has(m.id);
            const elsewhere = m.household_id && m.household_id !== editId;
            return (
              <li key={m.id}>
                <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-surface-2", on && "bg-grass-100")}>
                  <input type="checkbox" checked={on} onChange={() => toggle(m.id)} className="size-[18px] accent-[var(--grass)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{m.name}</span>
                    {elsewhere ? <span className="block truncate text-xs text-muted">Sekarang di: {m.household_name}</span> : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="space-y-3 rounded-2xl border border-border bg-surface-2 p-4">
        <Checkbox label="Tagihan aktif (ikut ditagih tiap bulan)" checked={v.is_active} onChange={(e) => setV({ ...v, is_active: e.target.checked })} />
        <Checkbox label="Ikut arisan tuan rumah rapat" checked={v.host_eligible} onChange={(e) => setV({ ...v, host_eligible: e.target.checked })} />
      </div>
      <Field label="Catatan" htmlFor="h-notes">
        <Textarea id="h-notes" rows={2} value={v.notes ?? ""} onChange={(e) => setV({ ...v, notes: e.target.value })} />
      </Field>
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-surface/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto">
          {!pending ? <Save /> : null} {editId ? "Simpan perubahan" : "Buat tagihan"}
        </Button>
      </div>
    </form>
  );
}
