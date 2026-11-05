import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { getInventoryCategories, getItemDetail } from "@/lib/services/inventory";
import { Card, CardBody } from "@/components/ui/card";
import { ItemForm } from "@/components/inventory/item-form";

export const metadata: Metadata = { title: "Ubah Barang" };

export default async function EditItemPage({ params }: PageProps<"/dashboard/inventory/[id]/edit">) {
  const session = await requirePermission("inventory.manage");
  const { id } = await params;
  const [detail, categories] = await Promise.all([getItemDetail(id), getInventoryCategories(session.organization.id)]);
  if (!detail) notFound();
  const it = detail.item;
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/dashboard/inventory/${id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Kembali
      </Link>
      <h2 className="mt-3 font-display text-xl font-bold">Ubah {it.name}</h2>
      <Card className="mt-4">
        <CardBody>
          <ItemForm
            editId={id}
            photoUrl={it.photoUrl}
            categories={categories}
            defaults={{
              name: it.name,
              unit_prefix: it.unit_prefix,
              asset_code: it.asset_code,
              category_id: it.category_id,
              description: it.description ?? "",
              unit_label: it.unit_label,
              purchase_date: it.purchase_date,
              purchase_price: it.purchase_price,
              location: it.location ?? "",
              initial_quantity: 0,
              initial_condition: "GOOD",
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
