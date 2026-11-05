import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { toNumber, todayJakarta } from "@/lib/utils/format";
import { CategoryManager } from "@/components/finance/category-manager";
import type { FinanceCategory } from "@/types/db";

export const metadata: Metadata = { title: "Kategori Keuangan" };

export default async function CategoriesPage() {
  const session = await requirePermission("finance.view");
  const supabase = await createClient();
  const today = todayJakarta();
  const [cats, summary] = await Promise.all([
    supabase.from("finance_categories").select("id,name,type,color,description,is_active").eq("organization_id", session.organization.id).order("name"),
    supabase.rpc("finance_category_summary", { p_from: `${today.slice(0, 4)}-01-01`, p_to: today }),
  ]);
  const usage: Record<string, { total: number; count: number }> = {};
  for (const r of (summary.data ?? []) as { category_id: string; total: number; count: number }[]) {
    usage[r.category_id] = { total: toNumber(r.total), count: Number(r.count) };
  }
  return <CategoryManager categories={(cats.data ?? []) as FinanceCategory[]} usage={usage} canManage={can(session.profile.role, "finance.manage")} />;
}
