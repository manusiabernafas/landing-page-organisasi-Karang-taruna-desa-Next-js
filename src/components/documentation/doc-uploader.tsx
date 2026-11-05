"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { uploadDocumentsAction } from "@/lib/actions/documents";
import { UPLOAD_LIMITS } from "@/lib/config";
import { todayJakartaClient } from "@/lib/utils/client-date";

interface Picked {
  file: File;
  url: string;
  size: { width: number; height: number } | null;
}

function readSize(url: string) {
  return new Promise<{ width: number; height: number } | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function DocUploader({
  events,
  defaultEventId,
  label = "Unggah foto",
  variant = "primary",
}: {
  events: { id: string; name: string }[];
  defaultEventId?: string;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [eventId, setEventId] = useState(defaultEventId ?? "");
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "INTERNAL">("INTERNAL");
  const [takenAt, setTakenAt] = useState(todayJakartaClient());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function add(files: FileList | null) {
    setError(null);
    if (!files) return;
    const next: Picked[] = [];
    for (const f of Array.from(files)) {
      if (!(UPLOAD_LIMITS.imageMimes as readonly string[]).includes(f.type)) {
        setError(`${f.name}: format harus JPG, PNG, atau WEBP.`);
        continue;
      }
      if (f.size > UPLOAD_LIMITS.imageMaxBytes) {
        setError(`${f.name}: ukuran maksimal 5 MB.`);
        continue;
      }
      const url = URL.createObjectURL(f);
      next.push({ file: f, url, size: await readSize(url) });
    }
    setPicked((p) => [...p, ...next].slice(0, 6));
  }

  function reset() {
    picked.forEach((p) => URL.revokeObjectURL(p.url));
    setPicked([]);
    setCaption("");
    setError(null);
  }

  function submit() {
    if (picked.length === 0) return setError("Pilih minimal satu foto.");
    const fd = new FormData();
    fd.set("payload", JSON.stringify({ event_id: eventId || null, caption, visibility, taken_at: takenAt || null, sizes: picked.map((p) => p.size) }));
    picked.forEach((p) => fd.append("files", p.file));
    start(async () => {
      const res = await uploadDocumentsAction(fd);
      if (res.ok) {
        toast.success(res.message);
        reset();
        setOpen(false);
        router.refresh();
      } else setError(res.error);
    });
  }

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <ImagePlus /> {label}
      </Button>
      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        size="lg"
        title="Unggah dokumentasi"
        description="Foto disimpan di Supabase Storage. Hanya foto berstatus Publik yang tampil di website."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={submit} loading={pending} disabled={picked.length === 0}>
              {!pending ? <Upload /> : null} Unggah {picked.length ? `${picked.length} foto` : ""}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label htmlFor="doc-files" className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border-strong bg-surface-2 px-4 py-8 text-center hover:border-grass">
            <ImagePlus className="size-7 text-grass" aria-hidden />
            <span className="font-semibold">Pilih foto kegiatan</span>
            <span className="text-xs text-muted">JPG, PNG, WEBP · maks 5 MB per foto · maks 6 foto sekali unggah</span>
          </label>
          <input id="doc-files" type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => add(e.target.files)} />
          {error ? (
            <p role="alert" className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          {picked.length ? (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {picked.map((p, i) => (
                <li key={p.url} className="relative overflow-hidden rounded-xl bg-bg-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="aspect-square w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(p.url);
                      setPicked((all) => all.filter((_, j) => j !== i));
                    }}
                    className="absolute top-1 right-1 inline-flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
                    aria-label={`Hapus ${p.file.name}`}
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Event" htmlFor="doc-event">
              <Select id="doc-event" value={eventId} onChange={(e) => setEventId(e.target.value)}>
                <option value="">Tanpa event (umum)</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tanggal foto" htmlFor="doc-date">
              <Input id="doc-date" type="date" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} />
            </Field>
          </div>
          <Field label="Keterangan" htmlFor="doc-caption" hint="Dipakai untuk semua foto yang diunggah sekaligus.">
            <Textarea id="doc-caption" rows={2} maxLength={300} value={caption} onChange={(e) => setCaption(e.target.value)} />
          </Field>
          <Field label="Visibilitas" htmlFor="doc-vis" hint="Pastikan wajah warga yang tidak berkenan tidak dipublikasikan.">
            <Select id="doc-vis" value={visibility} onChange={(e) => setVisibility(e.target.value as "PUBLIC" | "INTERNAL")}>
              <option value="INTERNAL">Internal (hanya anggota)</option>
              <option value="PUBLIC">Publik (tampil di website)</option>
            </Select>
          </Field>
        </div>
      </Dialog>
    </>
  );
}
