"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Button, type ButtonSize, type ButtonVariant } from "./button";
import { Dialog } from "./dialog";
import { Textarea } from "./form";
import type { ActionResult } from "@/lib/actions/result";

/**
 * Tombol dengan konfirmasi wajib sebelum menjalankan server action.
 * Dipakai untuk aksi destruktif / tidak bisa dibatalkan.
 */
export function ConfirmAction({
  label,
  icon,
  title,
  description,
  confirmLabel = "Ya, lanjutkan",
  variant = "danger-soft",
  confirmVariant = "danger",
  size = "sm",
  action,
  withReason,
  reasonLabel = "Alasan",
  successMessage,
  className,
}: {
  label: React.ReactNode;
  icon?: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  variant?: ButtonVariant;
  confirmVariant?: ButtonVariant;
  size?: ButtonSize;
  action: (reason?: string) => Promise<ActionResult<unknown>>;
  withReason?: boolean;
  reasonLabel?: string;
  successMessage?: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  function run() {
    start(async () => {
      const res = await action(withReason ? reason : undefined);
      if (res.ok) {
        toast.success(successMessage ?? res.message ?? "Berhasil disimpan.");
        setOpen(false);
        setReason("");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} className={className}>
        {icon}
        {label}
      </Button>
      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        size="sm"
        title={
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-warning" aria-hidden />
            {title}
          </span>
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button variant={confirmVariant} onClick={run} loading={pending} disabled={withReason && reason.trim().length < 3}>
              {confirmLabel}
            </Button>
          </>
        }
      >
        <div className="text-sm leading-relaxed text-muted">{description}</div>
        {withReason ? (
          <div className="mt-4">
            <label htmlFor="confirm-reason" className="mb-1.5 block text-sm font-semibold">
              {reasonLabel}
            </label>
            <Textarea id="confirm-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
