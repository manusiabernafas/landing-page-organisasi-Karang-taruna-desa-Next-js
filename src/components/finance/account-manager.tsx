"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Banknote, Landmark, PartyPopper, Pencil, Plus, Power, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { accountSchema, type AccountInput } from "@/lib/validations/finance";
import { saveAccountAction, toggleAccountAction } from "@/lib/actions/finance";
import { rupiah } from "@/lib/utils/format";

export interface AccountRow {
  account_id: string;
  name: string;
  type: "CASH" | "BANK" | "EWALLET" | "EVENT";
  event_id: string | null;
  is_active: boolean;
  balance: number;
  description?: string | null;
}

const ICON = { CASH: Banknote, BANK: Landmark, EWALLET: Smartphone, EVENT: PartyPopper };
const LABEL = { CASH: "Tunai", BANK: "Rekening bank", EWALLET: "E-wallet", EVENT: "Dana event" };

export function AccountManager({ accounts, canManage }: { accounts: AccountRow[]; canManage: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<AccountRow | "new" | null>(null);
  const [pending, start] = useTransition();
  const form = useForm<AccountInput>({ resolver: zodResolver(accountSchema) });
  const { errors } = form.formState;
  const kas = accounts.filter((a) => a.type !== "EVENT");
  const ev = accounts.filter((a) => a.type === "EVENT");

  function open(a: AccountRow | "new") {
    setEditing(a);
    form.reset(a === "new" ? { name: "", type: "BANK", description: "" } : { name: a.name, type: a.type === "EVENT" ? "CASH" : a.type, description: a.description ?? "" });
  }

  const submit = form.handleSubmit((v) =>
    start(async () => {
      const res = await saveAccountAction(v, editing && editing !== "new" ? editing.account_id : undefined);
      if (res.ok) {
        toast.success(res.message);
        setEditing(null);
        router.refresh();
      } else toast.error(res.error);
    }),
  );

  const toggle = (a: AccountRow) =>
    start(async () => {
      const res = await toggleAccountAction(a.account_id, !a.is_active);
      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else toast.error(res.error);
    });

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Akun kas organisasi</h2>
          {canManage ? (
            <Button size="sm" onClick={() => open("new")}>
              <Plus /> Tambah akun
            </Button>
          ) : null}
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {kas.map((a) => {
            const Icon = ICON[a.type];
            return (
              <li key={a.account_id} className="rounded-card border border-border bg-surface p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <ResourceIcon tone={a.type === "BANK" ? "sky" : a.type === "EWALLET" ? "gold" : "grass"} size="sm">
                      <Icon />
                    </ResourceIcon>
                    <div>
                      <p className="font-bold">{a.name}</p>
                      <p className="text-xs text-muted">{LABEL[a.type]}</p>
                    </div>
                  </div>
                  {!a.is_active ? <Badge tone="gray">Nonaktif</Badge> : null}
                </div>
                <p className="mt-4 font-display text-2xl font-extrabold tabular">{rupiah(a.balance)}</p>
                <p className="text-xs text-muted">Saldo dihitung otomatis dari transaksi — tidak bisa diedit manual.</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Link href={`/dashboard/finance/transactions?account=${a.account_id}`} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-grass-600 hover:bg-grass-100">
                    Mutasi
                  </Link>
                  {canManage ? (
                    <>
                      <button type="button" onClick={() => open(a)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-bg-soft">
                        <Pencil className="size-3.5" /> Ubah
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(a)}
                        disabled={pending || (a.is_active && a.balance !== 0)}
                        title={a.is_active && a.balance !== 0 ? "Kosongkan saldo (transfer) sebelum menonaktifkan" : undefined}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-bg-soft disabled:opacity-40"
                      >
                        <Power className="size-3.5" /> {a.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-1 font-display text-lg font-bold">Akun dana event</h2>
        <p className="mb-3 text-sm text-muted">Dibuat otomatis untuk setiap event, sehingga keuangan event tidak tercampur.</p>
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <ul className="divide-y divide-border">
            {ev.map((a) => (
              <li key={a.account_id}>
                <Link href={`/dashboard/events/${a.event_id}?tab=finance`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2">
                  <span className="flex min-w-0 items-center gap-3">
                    <PartyPopper className="size-4 shrink-0 text-gold-600" aria-hidden />
                    <span className="truncate text-sm font-semibold">{a.name.replace(/ #\w+$/, "")}</span>
                  </span>
                  <span className="font-bold tabular">{rupiah(a.balance)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Dialog
        open={editing !== null}
        onClose={() => !pending && setEditing(null)}
        title={editing === "new" ? "Tambah akun kas" : "Ubah akun kas"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={submit} loading={pending}>
              Simpan
            </Button>
          </>
        }
      >
        <form onSubmit={submit} noValidate className="space-y-4">
          <Field label="Nama akun" htmlFor="acc-name" error={errors.name?.message} required>
            <Input id="acc-name" placeholder="Contoh: Rekening BRI Pemuda RW 05" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
          </Field>
          <Field label="Jenis" htmlFor="acc-type">
            <Select id="acc-type" {...form.register("type")}>
              <option value="CASH">Tunai</option>
              <option value="BANK">Rekening bank</option>
              <option value="EWALLET">E-wallet</option>
            </Select>
          </Field>
          <Field label="Keterangan" htmlFor="acc-desc" hint="Opsional. Jangan tulis nomor rekening lengkap di sini.">
            <Textarea id="acc-desc" rows={2} {...form.register("description")} />
          </Field>
        </form>
      </Dialog>
    </div>
  );
}
