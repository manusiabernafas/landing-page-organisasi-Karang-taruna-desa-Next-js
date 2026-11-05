"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Globe2, Lock, Trash2 } from "lucide-react";
import { Gallery, type GalleryItem } from "./gallery";
import { deleteDocumentAction, setDocumentVisibilityAction } from "@/lib/actions/documents";

export type AdminDoc = GalleryItem & { visibility: "PUBLIC" | "INTERNAL"; canEdit: boolean };

export function DocGalleryAdmin({ items }: { items: AdminDoc[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const byId = new Map(items.map((i) => [i.id, i]));
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        router.refresh();
      } else toast.error(r.error);
    });

  return (
    <Gallery
      items={items.map((i) => ({
        ...i,
        badge: (
          <span className="mb-1 inline-flex items-center gap-1 text-[11px] font-bold text-muted">
            {i.visibility === "PUBLIC" ? <Globe2 className="size-3" aria-hidden /> : <Lock className="size-3" aria-hidden />}
            {i.visibility === "PUBLIC" ? "Publik" : "Internal"}
          </span>
        ),
      }))}
      renderActions={(it) => {
        const d = byId.get(it.id);
        if (!d?.canEdit) return null;
        return (
          <div className="flex justify-between gap-1">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setDocumentVisibilityAction(d.id, d.visibility === "PUBLIC" ? "INTERNAL" : "PUBLIC"))}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-muted hover:bg-bg-soft hover:text-text"
            >
              {d.visibility === "PUBLIC" ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {d.visibility === "PUBLIC" ? "Jadikan internal" : "Publikasikan"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => confirm("Hapus foto ini? File di storage juga ikut dihapus.") && run(() => deleteDocumentAction(d.id))}
              className="inline-flex size-8 items-center justify-center rounded-lg text-subtle hover:bg-danger-bg hover:text-danger"
              aria-label="Hapus foto"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        );
      }}
    />
  );
}
