"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ImagePlus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { itemSchema, type ItemInput } from "@/lib/validations/inventory";
import { saveItemAction } from "@/lib/actions/inventory";
import { UPLOAD_LIMITS } from "@/lib/config";

export function ItemForm({
  categories,
  defaults,
  editId,
  photoUrl,
}: {
  categories: { id: string; name: string }[];
  defaults: Partial<ItemInput>;
  editId?: string;
  photoUrl?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(photoUrl ?? null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const form = useForm<ItemInput>({
    resolver: zodResolver(itemSchema),
    defaultValues: { unit_label: "unit", initial_quantity: 0, initial_condition: "GOOD", description: "", location: "", asset_code: "", ...defaults },
  });
  const { errors } = form.formState;
  const prefix = form.watch("unit_prefix");
  const qty = form.watch("initial_quantity");

  function pick(f: File | null) {
    setPhotoError(null);
    if (!f) return;
    if (!(UPLOAD_LIMITS.imageMimes as readonly string[]).includes(f.type)) return setPhotoError("Format gambar harus JPG, PNG, atau WEBP.");
    if (f.size > UPLOAD_LIMITS.imageMaxBytes) return setPhotoError("Ukuran gambar maksimal 5 MB.");
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  }

  const onSubmit = form.handleSubmit((v) => {
    const fd = new FormData();
    fd.set("payload", JSON.stringify(v));
    if (photo) fd.set("photo", photo);
    start(async () => {
      const res = await saveItemAction(fd, editId);
      if (res.ok) {
        toast.success(res.message);
        router.push(`/dashboard/inventory/${res.data?.id ?? editId}`);
        router.refresh();
      } else {
        toast.error(res.error);
        for (const [k, m] of Object.entries(res.fieldErrors ?? {})) {
          if (k === "photo") setPhotoError(m);
          else form.setError(k as keyof ItemInput, { message: m });
        }
      }
    });
  });

  const numOrNull = (v: string) => (v === "" || v === null ? null : Number(v));

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 pb-20 sm:pb-0">
      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <div>
          <p className="mb-1.5 text-sm font-semibold">Foto</p>
          <label htmlFor="photo" className="relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border-strong bg-surface-2 hover:border-grass">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Pratinjau foto barang" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 px-3 text-center text-xs text-muted">
                <ImagePlus className="size-6" aria-hidden /> JPG/PNG/WEBP, maks 5 MB
              </span>
            )}
          </label>
          <input id="photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          {photoError ? (
            <p role="alert" className="mt-1.5 text-sm text-danger">
              {photoError}
            </p>
          ) : null}
        </div>
        <div className="space-y-4">
          <Field label="Nama barang" htmlFor="name" error={errors.name?.message} required>
            <Input id="name" placeholder="Contoh: Tenda Besar" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prefix kode unit" htmlFor="unit_prefix" error={errors.unit_prefix?.message} hint={editId ? "Tidak bisa diubah" : `Unit: ${prefix || "TND"}-001, ${prefix || "TND"}-002…`} required>
              <Input
                id="unit_prefix"
                maxLength={5}
                className="font-mono uppercase"
                readOnly={Boolean(editId)}
                aria-invalid={Boolean(errors.unit_prefix)}
                {...form.register("unit_prefix", { setValueAs: (v: string) => (v ?? "").toUpperCase().replace(/[^A-Z]/g, "") })}
              />
            </Field>
            <Field label="Kode aset" htmlFor="asset_code" error={errors.asset_code?.message} hint="Kosongkan untuk otomatis">
              <Input id="asset_code" className="font-mono uppercase" {...form.register("asset_code", { setValueAs: (v: string) => (v ?? "").toUpperCase().trim() })} />
            </Field>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kategori" htmlFor="category_id">
          <Select id="category_id" {...form.register("category_id", { setValueAs: (v: string) => v || null })}>
            <option value="">Tanpa kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Satuan" htmlFor="unit_label" error={errors.unit_label?.message} hint="unit, set, lusin, lembar…">
          <Input id="unit_label" {...form.register("unit_label")} />
        </Field>
      </div>

      <Field label="Deskripsi" htmlFor="description">
        <Textarea id="description" rows={2} {...form.register("description")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Tempat simpan" htmlFor="location">
          <Input id="location" placeholder="Gudang Sekretariat" {...form.register("location")} />
        </Field>
        <Field label="Tanggal beli" htmlFor="purchase_date">
          <Input id="purchase_date" type="date" {...form.register("purchase_date", { setValueAs: (v: string) => v || null })} />
        </Field>
        <Field label="Harga per unit (Rp)" htmlFor="purchase_price" error={errors.purchase_price?.message}>
          <Input id="purchase_price" type="number" min={0} inputMode="numeric" {...form.register("purchase_price", { setValueAs: numOrNull })} />
        </Field>
      </div>

      {!editId ? (
        <div className="rounded-2xl border border-border bg-surface-2 p-4">
          <p className="font-semibold">Buat unit sekaligus</p>
          <p className="mb-3 text-sm text-muted">Setiap unit mendapat kode unik, QR, dan riwayat sendiri.</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Jumlah unit" htmlFor="initial_quantity" error={errors.initial_quantity?.message}>
              <Input id="initial_quantity" type="number" min={0} max={500} inputMode="numeric" {...form.register("initial_quantity", { valueAsNumber: true })} />
            </Field>
            <Field label="Kondisi awal" htmlFor="initial_condition">
              <Select id="initial_condition" {...form.register("initial_condition")}>
                <option value="EXCELLENT">Sangat baik</option>
                <option value="GOOD">Baik</option>
                <option value="FAIR">Cukup</option>
              </Select>
            </Field>
          </div>
          {prefix && qty > 0 ? (
            <p className="mt-3 font-mono text-xs text-grass-600">
              Akan dibuat: {prefix}-001 … {prefix}-{String(qty).padStart(3, "0")}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-surface/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto">
          {!pending ? <Save /> : null} {editId ? "Simpan perubahan" : "Simpan barang"}
        </Button>
      </div>
    </form>
  );
}
