import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getAccountsWithBalance } from "@/lib/services/finance";
import { createClient } from "@/lib/supabase/server";
import { AccountManager, type AccountRow } from "@/components/finance/account-manager";

export const metadata: Metadata = { title: "Akun Kas" };

export default async function AccountsPage() {
  const session = await requirePermission("finance.view");
  const supabase = await createClient();
  const [balances, meta] = await Promise.all([
    getAccountsWithBalance(session.organization.id),
    supabase.from("finance_accounts").select("id,description").eq("organization_id", session.organization.id),
  ]);
  const desc = new Map(((meta.data ?? []) as { id: string; description: string | null }[]).map((m) => [m.id, m.description]));
  const rows: AccountRow[] = balances.map((b) => ({ ...b, description: desc.get(b.account_id) ?? null }));
  return <AccountManager accounts={rows} canManage={can(session.profile.role, "finance.manage")} />;
}
