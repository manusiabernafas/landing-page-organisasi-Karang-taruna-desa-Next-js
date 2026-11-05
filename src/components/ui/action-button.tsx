"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, type ButtonSize, type ButtonVariant } from "./button";
import type { ActionResult } from "@/lib/actions/result";

/** Tombol sekali klik untuk server action non-destruktif, dengan toast hasil. */
export function ActionButton({
  action,
  children,
  icon,
  variant = "primary",
  size = "md",
  className,
}: {
  action: () => Promise<ActionResult<unknown>>;
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await action();
          if (res.ok) {
            toast.success(res.message ?? "Berhasil disimpan.");
            router.refresh();
          } else toast.error(res.error);
        })
      }
    >
      {!pending ? icon : null}
      {children}
    </Button>
  );
}
