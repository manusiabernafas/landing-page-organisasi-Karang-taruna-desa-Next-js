"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ImagePlus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { eventSchema, type EventInput } from "@/lib/validations/events";
import { saveEventAction } from "@/lib/actions/events";
import { EVENT_STATUS } from "@/lib/utils/labels";
import { UPLOAD_LIMITS } from "@/lib/config";

const fmt = new Intl.NumberFormat("id-ID");

export function EventForm({ defaults, editId, coverUrl }: { defaults: Partial<EventInput>; editId?: string; coverUrl?: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [cover, setCover] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(coverUrl ?? null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const form = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: { kind: "EVENT", status: "PLANNING", budget: 0, is_public: true, description: "", location: "", ...defaults },
  });
  const { errors } = form.formState;
  const status = form.watch("status");

  function pickCover(f: File | null) {
    setCoverError(null);
    if (!f) return;
    if (!(UPLOAD_LIMITS.imageMimes as readonly string[]).includes(f.type)) return setCoverError("Format gambar harus JPG, PNG, atau WEBP.");
    if (f.size > UPLOAD_LIMITS.imageMaxBytes) return setCoverError("Ukuran gambar maksimal 5 MB.");
    setCover(f);
    setPreview(URL.createObjectURL(f));
  }

  const onSubmit = form.handleSubmit((v) => {
    const fd = new FormData();
    fd.set("payload", JSON.stringify(v));
    if (cover) fd.set("cover", cover);
    start(async () => {
      const res = await saveEventAction(fd, editId);
      if (res.ok) {
        toast.success(res.message);
        router.push(`/dashboard/events/${res.data?.id ?? editId}`);
        router.refresh();
      } else {
        toast.error(res.error);
        for (const [k, m] of Object.entries(res.fieldErrors ?? {})) {
          if (k === "cover") setCoverError(m);
          else form.setError(k as keyof EventInput, { message: m });
        }
      }
    });
  });

  const intField = (name: "target_participant" | "actual_participant") => ({
    ...form.register(name, { setValueAs: (v: string) => (v === "" || v === null ? null : Number(v)) }),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 pb-20 sm:pb-0">
      <div>
        <p className="mb-1.5 text-sm font-semibold">Cover event (opsional)</p>
        <label htmlFor="cover" className="relative flex aspect-[3/1] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border-strong bg-surface-2 hover:border-grass">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Pratinjau cover" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-sm text-muted">
              <ImagePlus className="size-6" aria-hidden /> Pilih gambar (JPG/PNG/WEBP, maks 5 MB)
            </span>
          )}
        </label>
        <input id="cover" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pickCover(e.target.files?.[0] ?? null)} />
        {coverError ? (
          <p role="alert" className="mt-1.5 text-sm font-medium text-danger">
            {coverError}
          </p>
        ) : null}
      </div>

      <Field label="Nama event" htmlFor="name" error={errors.name?.message} required>
        <Input id="name" placeholder="Contoh: Gebyar Kemerdekaan 2026" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Jenis" htmlFor="kind">
          <Select id="kind" {...form.register("kind")}>
            <option value="EVENT">Event (acara besar)</option>
            <option value="KEGIATAN">Kegiatan rutin</option>
          </Select>
        </Field>
        <Field label="Status" htmlFor="status">
          <Select id="status" {...form.register("status")}>
            {Object.entries(EVENT_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mulai" htmlFor="start_date" error={errors.start_date?.message} required>
          <Input id="start_date" type="datetime-local" aria-invalid={Boolean(errors.start_date)} {...form.register("start_date")} />
        </Field>
        <Field label="Selesai" htmlFor="end_date" error={errors.end_date?.message} required>
          <Input id="end_date" type="datetime-local" aria-invalid={Boolean(errors.end_date)} {...form.register("end_date")} />
        </Field>
      </div>

      <Field label="Lokasi" htmlFor="location" error={errors.location?.message}>
        <Input id="location" placeholder="Contoh: Lapangan RW 05 Kwarasan" {...form.register("location")} />
      </Field>

      <Field label="Deskripsi" htmlFor="description" error={errors.description?.message}>
        <Textarea id="description" rows={4} placeholder="Ceritakan tujuan dan rangkaian acaranya." {...form.register("description")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Budget (Rp)" htmlFor="budget" error={errors.budget?.message} required>
          <Controller
            control={form.control}
            name="budget"
            render={({ field }) => (
              <Input
                id="budget"
                inputMode="numeric"
                className="tabular"
                aria-invalid={Boolean(errors.budget)}
                value={field.value ? fmt.format(field.value) : "0"}
                onChange={(e) => {
                  const d = e.target.value.replace(/[^\d]/g, "").slice(0, 13);
                  field.onChange(d ? Number(d) : 0);
                }}
                onBlur={field.onBlur}
              />
            )}
          />
        </Field>
        <Field label="Target peserta" htmlFor="target_participant" error={errors.target_participant?.message}>
          <Input id="target_participant" type="number" min={0} inputMode="numeric" {...intField("target_participant")} />
        </Field>
        <Field label="Peserta hadir" htmlFor="actual_participant" error={errors.actual_participant?.message}>
          <Input id="actual_participant" type="number" min={0} inputMode="numeric" {...intField("actual_participant")} />
        </Field>
      </div>

      <div className="rounded-2xl border border-border bg-surface-2 p-4">
        <Checkbox label="Tampilkan di website publik (halaman Kegiatan)" disabled={status === "DRAFT"} {...form.register("is_public")} />
        <p className="mt-1.5 pl-7 text-xs text-muted">Event berstatus Draft selalu tersembunyi dari publik.</p>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-surface/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto">
          {!pending ? <Save /> : null} {editId ? "Simpan perubahan" : "Buat event"}
        </Button>
      </div>
    </form>
  );
}
