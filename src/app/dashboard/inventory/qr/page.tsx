import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/config";
import { FilterSelect } from "@/components/ui/filter-select";
import { EmptyState } from "@/components/ui/states";
import { PrintButton, QrSheet } from "@/components/inventory/qr-sheet";

export const metadata: Metadata = { title: "QR Code Inventaris" };

export default async function QrPage({ searchParams }: PageProps<"/dashboard/inventory/qr">) {
  const session = await requireSession();
  const sp = await searchParams;
  const itemId = typeof sp.item === "string" && /^[0-9a-f-]{36}$/.test(sp.item) ? sp.item : undefined;
  const supabase = await createClient();
  const { data: items } = await supabase.from("inventory_items").select("id,name,total_quantity").eq("organization_id", session.organization.id).eq("is_archived", false).order("name");
  const list = (items ?? []) as { id: string; name: string; total_quantity: number }[];
  const selected = itemId ?? list[0]?.id;
  const { data: units } = selected
    ? await supabase.from("inventory_units").select("unit_code, item:inventory_items(name)").eq("inventory_item_id", selected).neq("status", "LOST").order("unit_code")
    : { data: [] };
  const rows = ((units ?? []) as unknown as { unit_code: string; item: { name: string } | null }[]).map((u) => ({ code: u.unit_code, item: u.item?.name ?? "" }));

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 sm:max-w-sm">
          <FilterSelect param="item" label="Pilih barang" options={list.map((i) => ({ value: i.id, label: `${i.name} (${i.total_quantity})` }))} />
        </div>
        {rows.length ? <PrintButton label={`Cetak ${rows.length} label`} /> : null}
      </div>
      <p className="no-print text-sm text-muted">QR mengarah ke {SITE_URL.replace(/^https?:\/\//, "")}/inventory/scan/KODE. Cetak lalu tempel di barang (disarankan kertas stiker A4).</p>
      {rows.length === 0 ? <EmptyState compact illustration="box" title="Belum ada unit untuk dicetak." /> : <QrSheet units={rows} baseUrl={SITE_URL} />}
    </div>
  );
}
