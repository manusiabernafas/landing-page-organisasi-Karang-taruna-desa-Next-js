"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, PackagePlus, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { addUnitsAction, completeMaintenanceAction, setUnitConditionAction, startMaintenanceAction } from "@/lib/actions/inventory";
import type { ItemCondition } from "@/types/db";

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, done?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(res.message ?? "Tersimpan.");
        done?.();
        router.refresh();
      } else toast.error(res.error ?? "Belum berhasil. Coba lagi.");
    });
  return { pending, run };
}

export function AddUnitsButton({ itemId, prefix, nextNumber }: { itemId: string; prefix: string; nextNumber: number }) {
  const { pending, run } = useRun();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [cond, setCond] = useState<"EXCELLENT" | "GOOD" | "FAIR">("GOOD");
  const valid = Number.isInteger(qty) && qty >= 1 && qty <= 500;
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <PackagePlus /> Tambah unit
      </Button>
      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Tambah unit"
        description="Kode unit dibuat berurutan dan langsung punya QR."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button loading={pending} disabled={!valid} onClick={() => run(() => addUnitsAction(itemId, { quantity: qty, condition: cond }), () => setOpen(false))}>
              Tambah {valid ? qty : ""} unit
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Jumlah" htmlFor="qty" error={!valid ? "1–500 unit" : undefined}>
            <Input id="qty" type="number" min={1} max={500} value={Number.isNaN(qty) ? "" : qty} onChange={(e) => setQty(e.target.valueAsNumber)} />
          </Field>
          <Field label="Kondisi" htmlFor="cond">
            <Select id="cond" value={cond} onChange={(e) => setCond(e.target.value as typeof cond)}>
              <option value="EXCELLENT">Sangat baik</option>
              <option value="GOOD">Baik</option>
              <option value="FAIR">Cukup</option>
            </Select>
          </Field>
        </div>
        {valid ? (
          <p className="mt-3 font-mono text-sm text-grass-600">
            {prefix}-{String(nextNumber).padStart(3, "0")} … {prefix}-{String(nextNumber + qty - 1).padStart(3, "0")}
          </p>
        ) : null}
      </Dialog>
    </>
  );
}

export function UnitConditionForm({ unitId, condition, disabled }: { unitId: string; condition: ItemCondition; disabled?: boolean }) {
  const { pending, run } = useRun();
  const [value, setValue] = useState<ItemCondition>(condition);
  const [note, setNote] = useState("");
  return (
    <div className="space-y-3">
      <Field label="Kondisi unit" htmlFor="unit-cond" hint={value === "DAMAGED" ? "Unit rusak otomatis masuk maintenance dan tidak bisa dipinjam." : undefined}>
        <Select id="unit-cond" value={value} disabled={disabled} onChange={(e) => setValue(e.target.value as ItemCondition)}>
          <option value="EXCELLENT">Sangat baik</option>
          <option value="GOOD">Baik</option>
          <option value="FAIR">Cukup</option>
          <option value="DAMAGED">Rusak</option>
          <option value="LOST">Hilang</option>
        </Select>
      </Field>
      <Field label="Catatan" htmlFor="unit-note">
        <Textarea id="unit-note" rows={2} value={note} disabled={disabled} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: ada sobek kecil di sisi kanan" />
      </Field>
      <Button
        variant="secondary"
        loading={pending}
        disabled={disabled || (value === condition && !note.trim())}
        onClick={() => {
          if ((value === "LOST" || value === "DAMAGED") && !confirm(`Tandai unit sebagai ${value === "LOST" ? "HILANG" : "RUSAK"}?`)) return;
          run(() => setUnitConditionAction(unitId, value, note), () => setNote(""));
        }}
      >
        Simpan kondisi
      </Button>
    </div>
  );
}

export function StartMaintenanceButton({ unitId, disabled }: { unitId: string; disabled?: boolean }) {
  const { pending, run } = useRun();
  const [open, setOpen] = useState(false);
  const [issue, setIssue] = useState("");
  return (
    <>
      <Button variant="secondary" disabled={disabled} onClick={() => setOpen(true)}>
        <Wrench /> Maintenance
      </Button>
      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Masukkan ke maintenance"
        description="Selama maintenance, unit tidak bisa dipinjam."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button loading={pending} disabled={issue.trim().length < 3} onClick={() => run(() => startMaintenanceAction(unitId, issue), () => { setOpen(false); setIssue(""); })}>
              Mulai maintenance
            </Button>
          </>
        }
      >
        <Field label="Keterangan kerusakan" htmlFor="m-issue" required>
          <Textarea id="m-issue" rows={3} value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="Contoh: resleting pintu tenda macet" />
        </Field>
      </Dialog>
    </>
  );
}

export function CompleteMaintenanceButton({ id, unitCode, size = "sm" }: { id: string; unitCode: string; size?: "sm" | "md" }) {
  const { pending, run } = useRun();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ItemCondition>("GOOD");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <>
      <Button size={size} onClick={() => setOpen(true)}>
        <CheckCircle2 /> Selesaikan
      </Button>
      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title={`Selesaikan maintenance ${unitCode}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              loading={pending}
              onClick={() =>
                run(
                  () => completeMaintenanceAction(id, { result: result as "GOOD", cost: cost ? Number(cost) : null, notes }),
                  () => setOpen(false),
                )
              }
            >
              Simpan hasil
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Kondisi setelah perbaikan" htmlFor="m-result" hint={result === "DAMAGED" ? "Unit akan tercatat rusak permanen (tidak bisa dipinjam)." : undefined}>
            <Select id="m-result" value={result} onChange={(e) => setResult(e.target.value as ItemCondition)}>
              <option value="EXCELLENT">Sangat baik</option>
              <option value="GOOD">Baik</option>
              <option value="FAIR">Cukup</option>
              <option value="DAMAGED">Tidak bisa diperbaiki (rusak)</option>
              <option value="LOST">Hilang</option>
            </Select>
          </Field>
          <Field label="Biaya perbaikan (Rp)" htmlFor="m-cost" hint="Opsional. Catat juga sebagai pengeluaran di Keuangan bila memakai kas.">
            <Input id="m-cost" type="number" min={0} inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} />
          </Field>
          <Field label="Catatan" htmlFor="m-notes">
            <Textarea id="m-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </Dialog>
    </>
  );
}
