"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface GalleryItem {
  id: string;
  url: string | null;
  caption: string | null;
  meta?: string | null;
  width?: number | null;
  height?: number | null;
  badge?: React.ReactNode;
}

/** Galeri masonry (CSS columns) + lightbox aksesibel dengan navigasi keyboard. */
export function Gallery({ items, renderActions }: { items: GalleryItem[]; renderActions?: (item: GalleryItem) => React.ReactNode }) {
  const [index, setIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const open = index !== null;
  const current = index !== null ? items[index] : null;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const go = useCallback(
    (d: number) => setIndex((i) => (i === null ? i : (i + d + items.length) % items.length)),
    [items.length],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  return (
    <>
      <ul className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>li]:mb-3">
        {items.map((it, i) => (
          <li key={it.id} className="group relative break-inside-avoid overflow-hidden rounded-2xl border border-border bg-bg-soft">
            <button type="button" onClick={() => setIndex(i)} className="block w-full text-left" aria-label={`Buka foto: ${it.caption ?? "dokumentasi"}`}>
              {it.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.url}
                  alt={it.caption ?? "Dokumentasi kegiatan Pemuda RW 05"}
                  loading="lazy"
                  width={it.width ?? undefined}
                  height={it.height ?? undefined}
                  className="h-auto w-full transition-transform duration-300 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="aspect-[4/3]" />
              )}
              <div className="px-3 py-2.5">
                {it.badge}
                <p className="line-clamp-2 text-sm font-semibold text-text">{it.caption ?? "Tanpa keterangan"}</p>
                {it.meta ? <p className="mt-0.5 line-clamp-1 text-xs text-muted">{it.meta}</p> : null}
              </div>
            </button>
            {renderActions ? <div className="border-t border-border px-2 py-1.5">{renderActions(it)}</div> : null}
          </li>
        ))}
      </ul>
      <dialog
        ref={ref}
        onClose={() => setIndex(null)}
        onClick={(e) => e.target === ref.current && setIndex(null)}
        aria-label="Lihat foto"
        className="m-auto h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-black/85"
      >
        {current ? (
          <div className="flex h-full flex-col items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setIndex(null)}>
            <button
              type="button"
              onClick={() => setIndex(null)}
              className="absolute top-4 right-4 inline-flex size-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              aria-label="Tutup"
            >
              <X className="size-6" />
            </button>
            {items.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="absolute top-1/2 left-2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 sm:left-6"
                  aria-label="Foto sebelumnya"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="absolute top-1/2 right-2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 sm:right-6"
                  aria-label="Foto berikutnya"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            ) : null}
            {current.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.url} alt={current.caption ?? "Dokumentasi"} className="max-h-[78dvh] max-w-full rounded-xl object-contain" />
            ) : null}
            <div className="mt-4 max-w-2xl text-center text-white">
              <p className="font-semibold">{current.caption}</p>
              {current.meta ? <p className="mt-1 text-sm text-white/70">{current.meta}</p> : null}
              <p className="mt-2 text-xs text-white/50 tabular">
                {(index ?? 0) + 1} / {items.length}
              </p>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
