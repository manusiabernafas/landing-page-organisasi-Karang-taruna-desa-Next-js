"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Camera, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Avatar } from "@/components/ui/avatar";
import { memberSchema, type MemberInput } from "@/lib/validations/members";
import { saveMemberAction } from "@/lib/actions/members";
import { MEMBER_ROLE } from "@/lib/utils/labels";
import { UPLOAD_LIMITS } from "@/lib/config";

export function MemberForm({ defaults, editId, photoUrl }: { defaults: Partial<MemberInput>; editId?: string; photoUrl?: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(photoUrl ?? null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const form = useForm<MemberInput>({
    resolver: zodResolver(memberSchema),
    defaultValues: { role: "ANGGOTA", status: "ACTIVE", nickname: "", phone: "", address: "", bio: "", ...defaults },
  });
  const { errors } = form.formState;
  const name = form.watch("name") || "Anggota";

  function pick(f: File | null) {
    setPhotoError(null);
    if (!f) return;
    if (!(UPLOAD_LIMITS.imageMimes as readonly string[]).includes(f.type)) return setPhotoError("Format foto harus JPG, PNG, atau WEBP.");
    if (f.size > UPLOAD_LIMITS.avatarMaxBytes) return setPhotoError("Ukuran foto maksimal 2 MB.");
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  }

  const onSubmit = form.handleSubmit((v) => {
    const fd = new FormData();
    fd.set("payload", JSON.stringify(v));
    if (photo) fd.set("photo", photo);
    start(async () => {
      const res = await saveMemberAction(fd, editId);
      if (res.ok) {
        toast.success(res.message);
        router.push(`/dashboard/members/${res.data?.id ?? editId}`);
        router.refresh();
      } else {
        toast.error(res.error);
        for (const [k, m] of Object.entries(res.fieldErrors ?? {})) {
          if (k === "photo") setPhotoError(m);
          else form.setError(k as keyof MemberInput, { message: m });
        }
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 pb-20 sm:pb-0">
      <div className="flex items-center gap-4">
        <label htmlFor="photo" className="relative cursor-pointer">
          <Avatar name={name} src={preview} size={84} />
          <span className="absolute -right-1 -bottom-1 inline-flex size-8 items-center justify-center rounded-full bg-grass text-white ring-2 ring-surface dark:text-forest">
            <Camera className="size-4" aria-hidden />
          </span>
        </label>
        <div className="text-sm text-muted">
          <p className="font-semibold text-text">Foto profil</p>
          JPG/PNG/WEBP, maks 2 MB. Hanya terlihat oleh anggota.
          {photoError ? (
            <p role="alert" className="mt-1 text-danger">
              {photoError}
            </p>
          ) : null}
        </div>
        <input id="photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <Field label="Nama lengkap" htmlFor="name" error={errors.name?.message} required>
          <Input id="name" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
        </Field>
        <Field label="Nama panggilan" htmlFor="nickname">
          <Input id="nickname" {...form.register("nickname")} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Jabatan" htmlFor="role">
          <Select id="role" {...form.register("role")}>
            {Object.entries(MEMBER_ROLE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="status">
          <Select id="status" {...form.register("status")}>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </Select>
        </Field>
        <Field label="Bergabung" htmlFor="join_date" error={errors.join_date?.message} required>
          <Input id="join_date" type="date" {...form.register("join_date")} />
        </Field>
      </div>
      <fieldset className="space-y-4 rounded-2xl border border-border bg-surface-2 p-4">
        <legend className="px-1 text-sm font-semibold">Data pribadi (hanya pengurus inti)</legend>
        <Field label="Nomor HP" htmlFor="phone" error={errors.phone?.message}>
          <Input id="phone" inputMode="tel" {...form.register("phone")} />
        </Field>
        <Field label="Alamat" htmlFor="address">
          <Textarea id="address" rows={2} placeholder="Kwarasan RT 0x/RW 05, Nogotirto" {...form.register("address")} />
        </Field>
      </fieldset>
      <Field label="Bio singkat" htmlFor="bio" error={errors.bio?.message}>
        <Textarea id="bio" rows={2} {...form.register("bio")} />
      </Field>
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-surface/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto">
          {!pending ? <Save /> : null} {editId ? "Simpan perubahan" : "Tambah anggota"}
        </Button>
      </div>
    </form>
  );
}
