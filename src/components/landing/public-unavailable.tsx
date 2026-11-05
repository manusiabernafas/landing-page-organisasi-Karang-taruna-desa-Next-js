import { EmptyCamp } from "@/components/illustrations/empty-camp";

export function PublicUnavailable({ what }: { what: string }) {
  return (
    <div role="status" className="rounded-card border border-dashed border-border-strong bg-surface-2 px-6 py-12 text-center">
      <EmptyCamp variant="rain" className="mx-auto h-24" />
      <p className="mt-3 font-display text-lg font-bold text-text">Data {what} belum berhasil dimuat. Coba lagi.</p>
      <p className="mt-1 text-sm text-muted">Basecamp sedang menyambungkan data. Muat ulang halaman sebentar lagi.</p>
    </div>
  );
}
