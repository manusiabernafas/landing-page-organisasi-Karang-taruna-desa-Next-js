"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Paperclip, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { transactionSchema, type TransactionInput } from "@/lib/validations/finance";
import { saveTransactionAction } from "@/lib/actions/finance";
import { PAYMENT_METHOD } from "@/lib/utils/labels";
import { UPLOAD_LIMITS } from "@/lib/config";
import { cn } from "@/lib/utils/cn";
import type { FinanceCategory } from "@/types/db";

export interface AccountOption {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  eventName: string | null;
  eventStatus: string | null;
}

const types = [
  { key: "INCOME", label: "Pemasukan", icon: ArrowDownLeft, active: "bg-success text-white dark:text-forest" },
  { key: "EXPENSE", label: "Pengeluaran", icon: ArrowUpRight, active: "bg-danger text-white dark:text-forest" },
  { key: "TRANSFER", label: "Transfer", icon: ArrowLeftRight, active: "bg-sky text-white dark:text-forest" },
] as const;

const fmt = new Intl.NumberFormat("id-ID");

export function TransactionForm({
  categories,
  accounts,
  canApprove,
  defaults,
  editId,
  hasAttachment,
}: {
  categories: FinanceCategory[];
  accounts: AccountOption[];
  canApprove: boolean;
  defaults: Partial<TransactionInput>;
  editId?: string;
  hasAttachment?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const form = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "INCOME",
      payment_method: "CASH",
      is_public: true,
      approve_now: canApprove,
      description: "",
      transaction_code: "",
      ...defaults,
    },
  });
  const { errors } = form.formState;
  const type = form.watch("type");
  const approveNow = form.watch("approve_now");
  const accountId = form.watch("account_id");
  const cats = useMemo(() => categories.filter((c) => c.type === type && (c.is_active || c.id === defaults.category_id)), [categories, type, defaults.category_id]);
  const usable = accounts.filter((a) => a.is_active && a.eventStatus !== "CANCELLED" && (a.eventStatus !== "COMPLETED" || a.id === defaults.account_id));
  const kas = usable.filter((a) => a.type !== "EVENT");
  const ev = usable.filter((a) => a.type === "EVENT");
  const selected = accounts.find((a) => a.id === accountId);

  function onFile(f: File | null) {
    setFileError(null);
    if (!f) return setFile(null);
    if (!(UPLOAD_LIMITS.attachmentMimes as readonly string[]).includes(f.type)) {
      setFileError("Format file harus JPG, PNG, WEBP, atau PDF.");
      return setFile(null);
    }
    if (f.size > UPLOAD_LIMITS.imageMaxBytes) {
      setFileError("Ukuran file maksimal 5 MB.");
      return setFile(null);
    }
    setFile(f);
  }

  const onSubmit = form.handleSubmit((values) => {
    if (fileError) return;
    const fd = new FormData();
    fd.set("payload", JSON.stringify(values));
    if (file) fd.set("attachment", file);
    start(async () => {
      const res = await saveTransactionAction(fd, editId);
      if (res.ok) {
        toast.success(res.message);
        router.push(`/dashboard/finance/transactions/${res.data?.id ?? editId}`);
        router.refresh();
      } else {
        toast.error(res.error);
        for (const [k, msg] of Object.entries(res.fieldErrors ?? {})) {
          if (k === "attachment") setFileError(msg);
          else form.setError(k as keyof TransactionInput, { message: msg });
        }
      }
    });
  });

  const accountOptions = (list: AccountOption[]) =>
    list.map((a) => (
      <option key={a.id} value={a.id}>
        {a.eventName ?? a.name}
      </option>
    ));

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 pb-20 sm:pb-0">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Jenis transaksi</legend>
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-bg-soft p-1.5">
          {types.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={type === t.key}
              disabled={Boolean(editId) && t.key !== type}
              onClick={() => {
                form.setValue("type", t.key);
                form.setValue("category_id", undefined);
              }}
              className={cn(
                "flex h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-bold transition-colors sm:flex-row sm:gap-2 sm:text-sm disabled:opacity-40",
                type === t.key ? t.active : "text-muted hover:bg-surface",
              )}
            >
              <t.icon className="size-4" aria-hidden /> {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      <Field label="Nominal (Rp)" htmlFor="amount" error={errors.amount?.message} required>
        <Controller
          control={form.control}
          name="amount"
          render={({ field }) => (
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-display text-lg font-bold text-muted">Rp</span>
              <Input
                id="amount"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                className="h-14 pl-12 font-display text-2xl font-extrabold tabular"
                aria-invalid={Boolean(errors.amount)}
                value={field.value ? fmt.format(field.value) : ""}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 13);
                  field.onChange(digits ? Number(digits) : undefined);
                }}
                onBlur={field.onBlur}
              />
            </div>
          )}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tanggal" htmlFor="transaction_date" error={errors.transaction_date?.message} required>
          <Input id="transaction_date" type="date" aria-invalid={Boolean(errors.transaction_date)} {...form.register("transaction_date")} />
        </Field>
        <Field label="Metode pembayaran" htmlFor="payment_method">
          <Select id="payment_method" {...form.register("payment_method")}>
            {Object.entries(PAYMENT_METHOD).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={type === "TRANSFER" ? "Dari akun" : "Akun / dana"}
          htmlFor="account_id"
          error={errors.account_id?.message}
          hint={selected?.type === "EVENT" ? "Transaksi masuk ke dana event ini saja — tidak tercampur dengan kas organisasi." : undefined}
          required
        >
          <Select id="account_id" aria-invalid={Boolean(errors.account_id)} {...form.register("account_id")}>
            <option value="">Pilih akun…</option>
            <optgroup label="Kas organisasi">{accountOptions(kas)}</optgroup>
            {ev.length ? <optgroup label="Dana event">{accountOptions(ev)}</optgroup> : null}
          </Select>
        </Field>
        {type === "TRANSFER" ? (
          <Field label="Ke akun" htmlFor="to_account_id" error={errors.to_account_id?.message} required>
            <Select id="to_account_id" aria-invalid={Boolean(errors.to_account_id)} {...form.register("to_account_id")}>
              <option value="">Pilih akun tujuan…</option>
              <optgroup label="Kas organisasi">{accountOptions(kas)}</optgroup>
              {ev.length ? <optgroup label="Dana event">{accountOptions(ev)}</optgroup> : null}
            </Select>
          </Field>
        ) : (
          <Field label="Kategori" htmlFor="category_id" error={errors.category_id?.message} required>
            <Select id="category_id" aria-invalid={Boolean(errors.category_id)} {...form.register("category_id")}>
              <option value="">Pilih kategori…</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      <Field label="Keterangan" htmlFor="description" error={errors.description?.message} hint="Opsional. Contoh: Iuran anggota bulan Oktober.">
        <Textarea id="description" rows={2} {...form.register("description")} />
      </Field>

      {!editId ? (
        <Field label="Kode transaksi" htmlFor="transaction_code" error={errors.transaction_code?.message} hint="Kosongkan agar dibuat otomatis (contoh: IN-2610-00012).">
          <Input
            id="transaction_code"
            className="font-mono uppercase"
            {...form.register("transaction_code", { setValueAs: (v: string) => (v ?? "").toUpperCase().trim() })}
          />
        </Field>
      ) : null}

      <div>
        <p className="mb-1.5 text-sm font-semibold">Lampiran bukti (opsional)</p>
        <label
          htmlFor="attachment"
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border-strong bg-surface-2 px-4 py-3 text-sm hover:border-grass",
            fileError && "border-danger",
          )}
        >
          <Paperclip className="size-4 text-muted" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{file ? file.name : hasAttachment ? "Lampiran sudah ada — pilih file untuk mengganti" : "Nota / kuitansi (JPG, PNG, WEBP, PDF · maks 5 MB)"}</span>
          {file ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onFile(null);
              }}
              className="inline-flex size-7 items-center justify-center rounded-md hover:bg-bg-soft"
              aria-label="Hapus lampiran"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </label>
        <input
          id="attachment"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        {fileError ? (
          <p role="alert" className="mt-1.5 text-sm font-medium text-danger">
            {fileError}
          </p>
        ) : null}
      </div>

      {canApprove ? (
        <div className="space-y-3 rounded-2xl border border-border bg-surface-2 p-4">
          <Checkbox label="Setujui sekarang (langsung memengaruhi saldo)" {...form.register("approve_now")} />
          <Checkbox
            label="Tampilkan di halaman transparansi publik"
            disabled={!approveNow}
            {...form.register("is_public")}
          />
        </div>
      ) : (
        <p className="rounded-2xl bg-bg-soft p-4 text-sm text-muted">Transaksi akan menunggu persetujuan bendahara sebelum memengaruhi saldo.</p>
      )}

      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-surface/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto">
          {!pending ? <Save /> : null} {editId ? "Simpan perubahan" : "Simpan transaksi"}
        </Button>
      </div>
    </form>
  );
}
