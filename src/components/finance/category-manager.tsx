"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil, Plus, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { categorySchema, type CategoryInput } from "@/lib/validations/finance";
import { saveCategoryAction, toggleCategoryAction } from "@/lib/actions/finance";
import { rupiah } from "@/lib/utils/format";
import type { FinanceCategory } from "@/types/db";

const SWATCHES = ["#3E9B4F", "#3D95CF", "#F2B632", "#8B5E3C", "#E07A5F", "#C77DFF", "#7BC47F", "#6B7280"];

export function CategoryManager({
  categories,
  usage,
  canManage,
}: {
  categories: FinanceCategory[];
  usage: Record<string, { total: number; count: number }>;
  canManage: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<FinanceCategory | "new-INCOME" | "new-EXPENSE" | null>(null);
  const [pending, start] = useTransition();
  const form = useForm<CategoryInput>({ resolver: zodResolver(categorySchema) });
  const { errors } = form.formState;

  function open(target: FinanceCategory | "new-INCOME" | "new-EXPENSE") {
    setEditing(target);
    if (typeof target === "string") {
      form.reset({ name: "", type: target === "new-INCOME" ? "INCOME" : "EXPENSE", color: SWATCHES[0], description: "" });
    } else {
      form.reset({ name: target.name, type: target.type, color: (target.color ?? SWATCHES[0]).toUpperCase(), description: target.description ?? "" });
    }
  }

  const onSubmit = form.handleSubmit((v) =>
    start(async () => {
      const res = await saveCategoryAction(v, typeof editing === "object" && editing ? editing.id : undefined);
      if (res.ok) {
        toast.success(res.message);
        setEditing(null);
        router.refresh();
      } else {
        toast.error(res.error);
        for (const [k, m] of Object.entries(res.fieldErrors ?? {})) form.setError(k as keyof CategoryInput, { message: m });
      }
    }),
  );

  function toggle(c: FinanceCategory) {
    start(async () => {
      const res = await toggleCategoryAction(c.id, !c.is_active);
      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else toast.error(res.error);
    });
  }

  const color = form.watch("color");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {(["INCOME", "EXPENSE"] as const).map((type) => {
        const list = categories.filter((c) => c.type === type);
        return (
          <section key={type} aria-labelledby={`cat-${type}`} className="rounded-card border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 id={`cat-${type}`} className="font-display font-bold">
                {type === "INCOME" ? "Kategori pemasukan" : "Kategori pengeluaran"}
              </h2>
              {canManage ? (
                <Button size="sm" variant="secondary" onClick={() => open(type === "INCOME" ? "new-INCOME" : "new-EXPENSE")}>
                  <Plus /> Tambah
                </Button>
              ) : null}
            </div>
            {list.length === 0 ? (
              <div className="p-5">
                <EmptyState compact illustration="wallet" title="Belum ada kategori." />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {list.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="size-3.5 shrink-0 rounded-md" style={{ background: c.color ?? "#999" }} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-semibold">
                        <span className="truncate">{c.name}</span>
                        {!c.is_active ? <Badge tone="gray">Nonaktif</Badge> : null}
                      </p>
                      <p className="text-xs text-muted tabular">
                        {usage[c.id] ? `${usage[c.id].count} transaksi · ${rupiah(usage[c.id].total)} tahun ini` : "Belum dipakai tahun ini"}
                      </p>
                    </div>
                    {canManage ? (
                      <div className="flex shrink-0 gap-1">
                        <Button size="icon-sm" variant="ghost" onClick={() => open(c)} aria-label={`Ubah kategori ${c.name}`}>
                          <Pencil />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => toggle(c)}
                          disabled={pending}
                          aria-label={c.is_active ? `Nonaktifkan ${c.name}` : `Aktifkan ${c.name}`}
                          title={c.is_active ? "Nonaktifkan" : "Aktifkan"}
                        >
                          <Power />
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <Dialog
        open={editing !== null}
        onClose={() => !pending && setEditing(null)}
        title={typeof editing === "object" && editing ? "Ubah kategori" : "Tambah kategori"}
        description="Kategori membantu laporan kas lebih mudah dibaca."
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={onSubmit} loading={pending}>
              Simpan
            </Button>
          </>
        }
      >
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Field label="Nama kategori" htmlFor="cat-name" error={errors.name?.message} required>
            <Input id="cat-name" autoFocus aria-invalid={Boolean(errors.name)} {...form.register("name")} />
          </Field>
          <Field label="Jenis" htmlFor="cat-type">
            <Select id="cat-type" disabled={typeof editing === "object" && editing !== null} {...form.register("type")}>
              <option value="INCOME">Pemasukan</option>
              <option value="EXPENSE">Pengeluaran</option>
            </Select>
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Warna</legend>
            <div className="flex flex-wrap gap-2">
              {SWATCHES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => form.setValue("color", s)}
                  className="size-9 rounded-xl ring-offset-2 ring-offset-surface transition-shadow aria-pressed:ring-2 aria-pressed:ring-text"
                  style={{ background: s }}
                  aria-pressed={color === s}
                  aria-label={`Warna ${s}`}
                />
              ))}
            </div>
          </fieldset>
          <Field label="Deskripsi" htmlFor="cat-desc" hint="Opsional">
            <Textarea id="cat-desc" rows={2} {...form.register("description")} />
          </Field>
        </form>
      </Dialog>
    </div>
  );
}
