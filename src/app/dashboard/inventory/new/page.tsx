import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { getInventoryCategories } from "@/lib/services/inventory";
import { Card, CardBody } from "@/components/ui/card";
import { ItemForm } from "@/components/inventory/item-form";

export const metadata: Metadata = { title: "Tambah Barang" };

export default async function NewItemPage() {
  const session = await requirePermission("inventory.manage");
  const categories = await getInventoryCategories(session.organization.id);
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/inventory" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Semua barang
      </Link>
      <h2 className="mt-3 font-display text-xl font-bold">Tambah barang</h2>
      <Card className="mt-4">
        <CardBody>
          <ItemForm categories={categories} defaults={{}} />
        </CardBody>
      </Card>
    </div>
  );
}
