"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "./button";
import { EmptyCamp } from "@/components/illustrations/empty-camp";

export function ErrorState({
  title = "Data belum berhasil dimuat. Coba lagi.",
  description = "Mungkin koneksi sedang lambat atau basecamp sedang sibuk. Tenang, datamu aman.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center rounded-card border border-border bg-surface px-6 py-12 text-center">
      <EmptyCamp variant="rain" className="h-28" />
      <h2 className="mt-4 font-display text-lg font-bold">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>
      <Button className="mt-5" onClick={() => (onRetry ? onRetry() : window.location.reload())}>
        <RefreshCw /> Coba Lagi
      </Button>
    </div>
  );
}
