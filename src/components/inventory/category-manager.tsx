"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { deleteInventoryCategoryAction, saveInventoryCategoryAction } from "@/lib/actions/inventory";

type Cat = { id: string; name: string; description: string | null };

export function InventoryCategoryManager({ categories, usage, canManage }: { categories: Cat[]; usage: Record<string, { items: number; units: number }>; canManage: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Cat | "new" | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [pending, start] = useTransition();

  function open(c: Cat | "new") {
    setEditing(c);
    setName(c === "new" ? "" : c.name);
    setDesc(c === "new" ? "" : c.description ?? "");
  }
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, done?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        done?.();
        router.refresh();
      } else toast.error(r.error);
    });

  return (
    <div className="space-y-4">
      {canManage ? (
        <Button onClick={() => open("new")}>
          <Plus /> Tambah kategori
        </Button>
      ) : null}
      {categories.length === 0 ? (
        <EmptyState illustration="box" title="Belum ada kategori." description="Kelompokkan barang, misal: Tenda & Terpal, Furnitur, Elektronik." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.id} className="flex items-start gap-3 rounded-card border border-border bg-surface p-4">
              <ResourceIcon tone="wood" size="sm">
                <FolderOpen />
              </ResourceIcon>
              <div className="min-w-0 flex-1">
                <Link href={`/dashboard/inventory?category=${c.id}`} className="font-bold hover:text-grass-600">
                  {c.name}
                </Link>
                <p className="text-xs text-muted tabular">
                  {usage[c.id]?.items ?? 0} jenis · {usage[c.id]?.units ?? 0} unit
                </p>
                {c.description ? <p className="mt-1 text-sm text-muted">{c.description}</p> : null}
              </div>
              {canManage ? (
                <div className="flex gap-1">
                  <Button size="icon-sm" variant="ghost" onClick={() => open(c)} aria-label={`Ubah ${c.name}`}>
                    <Pencil />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => confirm(`Hapus kategori "${c.name}"?`) && run(() => deleteInventoryCategoryAction(c.id))}
                    aria-label={`Hapus ${c.name}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={editing !== null}
        onClose={() => !pending && setEditing(null)}
        title={editing === "new" ? "Tambah kategori" : "Ubah kategori"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button
              loading={pending}
              disabled={name.trim().length < 2}
              onClick={() => run(() => saveInventoryCategoryAction({ name, description: desc }, editing && editing !== "new" ? editing.id : undefined), () => setEditing(null))}
            >
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nama kategori" htmlFor="ic-name" required>
            <Input id="ic-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Deskripsi" htmlFor="ic-desc">
            <Textarea id="ic-desc" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
