"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dices, Home, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Dialog } from "@/components/ui/dialog";
import { drawHostAction, setHostAction } from "@/lib/actions/dues";

/**
 * Kocok tuan rumah rapat. Hasil diacak di database (bukan di browser),
 * animasi di sini hanya efek visual sambil menunggu hasil.
 */
export function HostDraw({ year, candidates, defaultDate }: { year: number; candidates: { id: string; name: string }[]; defaultDate: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [date, setDate] = useState(defaultDate);
  const [rolling, setRolling] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; members: string[] } | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualId, setManualId] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  function draw() {
    if (candidates.length === 0) return;
    setResult(null);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      let i = 0;
      timer.current = setInterval(() => setRolling(candidates[i++ % candidates.length].name), 90);
    }
    start(async () => {
      const [res] = await Promise.all([drawHostAction({ year, meeting_date: date || null }), new Promise((r) => setTimeout(r, reduce ? 0 : 1600))]);
      if (timer.current) clearInterval(timer.current);
      setRolling(null);
      if (res.ok && res.data) {
        setResult(res.data);
        toast.success(res.message);
        router.refresh();
      } else if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <div className="overflow-hidden rounded-[26px] bg-forest text-white shadow-soft">
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <p className="text-[11px] font-extrabold tracking-[0.18em] text-gold uppercase">Arisan tuan rumah rapat {year}</p>
          <h2 className="mt-1 font-display text-3xl font-extrabold">Rapat berikutnya di rumah siapa?</h2>
          <p className="mt-2 text-sm text-[#b9cbb8]">
            Dikocok dari {candidates.length} rumah yang belum pernah ketempatan tahun ini. Rumah yang sudah jadi tuan rumah tidak ikut lagi sampai tahun depan.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Tanggal rapat" htmlFor="meet-date" className="sm:w-48 [&_label]:text-white">
              <Input id="meet-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border-white/20 bg-white/10 text-white" />
            </Field>
            <Button variant="gold" size="lg" onClick={draw} loading={pending} disabled={candidates.length === 0}>
              {!pending ? <Dices /> : null} Kocok sekarang
            </Button>
            <Button size="lg" className="bg-white/10 text-white shadow-none hover:bg-white/20" onClick={() => setManualOpen(true)} disabled={candidates.length === 0}>
              Tetapkan manual
            </Button>
          </div>
        </div>
        <div className="flex min-h-44 flex-col items-center justify-center rounded-3xl bg-white/6 p-6 text-center ring-1 ring-white/10" aria-live="polite">
          {rolling ? (
            <>
              <Dices className="size-8 animate-spin text-gold" aria-hidden />
              <p className="mt-3 font-display text-2xl font-extrabold text-white/80">{rolling}</p>
            </>
          ) : result ? (
            <div className="anim-rise">
              <PartyPopper className="mx-auto size-9 text-gold" aria-hidden />
              <p className="mt-2 text-xs font-bold tracking-[0.16em] text-gold uppercase">Tuan rumah rapat</p>
              <p className="mt-1 font-display text-3xl font-extrabold">{result.name}</p>
              {result.members.length > 1 ? <p className="mt-1 text-sm text-[#b9cbb8]">{result.members.join(" · ")}</p> : null}
            </div>
          ) : candidates.length === 0 ? (
            <>
              <Home className="size-9 text-gold" aria-hidden />
              <p className="mt-2 font-semibold">Semua rumah sudah pernah jadi tuan rumah tahun ini.</p>
              <p className="text-sm text-[#b9cbb8]">Kocokan dimulai lagi dari awal tahun depan.</p>
            </>
          ) : (
            <>
              <Home className="size-9 text-gold" aria-hidden />
              <p className="mt-2 text-sm text-[#b9cbb8]">Tekan &ldquo;Kocok sekarang&rdquo; di depan peserta rapat supaya adil & transparan.</p>
            </>
          )}
        </div>
      </div>
      <Dialog
        open={manualOpen}
        onClose={() => !pending && setManualOpen(false)}
        title="Tetapkan tuan rumah manual"
        description="Untuk kesepakatan rapat, misalnya rumah yang menawarkan diri. Tetap tercatat dan tidak bisa ketempatan dua kali di tahun yang sama."
        footer={
          <>
            <Button variant="secondary" onClick={() => setManualOpen(false)}>
              Batal
            </Button>
            <Button
              loading={pending}
              disabled={!manualId}
              onClick={() =>
                start(async () => {
                  const r = await setHostAction(year, manualId, date || null);
                  if (r.ok) {
                    toast.success(r.message);
                    setManualOpen(false);
                    setManualId("");
                    router.refresh();
                  } else toast.error(r.error);
                })
              }
            >
              Tetapkan
            </Button>
          </>
        }
      >
        <Field label="Rumah" htmlFor="manual-house">
          <Select id="manual-house" value={manualId} onChange={(e) => setManualId(e.target.value)}>
            <option value="">Pilih rumah…</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </Dialog>
    </div>
  );
}
