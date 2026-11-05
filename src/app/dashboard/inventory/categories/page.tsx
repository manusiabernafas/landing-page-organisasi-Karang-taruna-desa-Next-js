import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { InventoryCategoryManager } from "@/components/inventory/category-manager";

export const metadata: Metadata = { title: "Kategori Inventaris" };

export default async function InventoryCategoriesPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const [cats, items] = await Promise.all([
    supabase.from("inventory_categories").select("id,name,description").eq("organization_id", session.organization.id).order("name"),
    supabase.from("inventory_items").select("category_id,total_quantity").eq("organization_id", session.organization.id).eq("is_archived", false),
  ]);
  const usage: Record<string, { items: number; units: number }> = {};
  for (const it of (items.data ?? []) as { category_id: string | null; total_quantity: number }[]) {
    if (!it.category_id) continue;
    usage[it.category_id] = { items: (usage[it.category_id]?.items ?? 0) + 1, units: (usage[it.category_id]?.units ?? 0) + it.total_quantity };
  }
  return (
    <InventoryCategoryManager
      categories={(cats.data ?? []) as { id: string; name: string; description: string | null }[]}
      usage={usage}
      canManage={can(session.profile.role, "inventory.manage")}
    />
  );
}
