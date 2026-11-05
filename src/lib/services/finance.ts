import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toNumber } from "@/lib/utils/format";
import type { AccountBalance, FinanceAccount, FinanceCategory, FinanceTransaction } from "@/types/db";

export async function getAccountsWithBalance(orgId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_account_balances")
    .select("account_id,name,type,event_id,is_active,total_income,total_expense,transfer_in,transfer_out,balance")
    .eq("organization_id", orgId)
    .order("type")
    .order("name");
  if (error) throw new Error(error.message);
  return ((data ?? []) as AccountBalance[]).map((a) => ({
    ...a,
    total_income: toNumber(a.total_income),
    total_expense: toNumber(a.total_expense),
    transfer_in: toNumber(a.transfer_in),
    transfer_out: toNumber(a.transfer_out),
    balance: toNumber(a.balance),
  }));
}

export async function getFormOptions(orgId: string) {
  const supabase = await createClient();
  const [cats, accs, events] = await Promise.all([
    supabase.from("finance_categories").select("id,name,type,color,description,is_active").eq("organization_id", orgId).order("name"),
    supabase.from("finance_accounts").select("id,organization_id,name,type,event_id,description,is_active").eq("organization_id", orgId).order("type").order("name"),
    supabase.from("events").select("id,name,status").eq("organization_id", orgId),
  ]);
  const evMap = new Map(((events.data ?? []) as { id: string; name: string; status: string }[]).map((e) => [e.id, e]));
  return {
    categories: (cats.data ?? []) as FinanceCategory[],
    accounts: ((accs.data ?? []) as FinanceAccount[]).map((a) => ({
      ...a,
      eventName: a.event_id ? evMap.get(a.event_id)?.name ?? null : null,
      eventStatus: a.event_id ? evMap.get(a.event_id)?.status ?? null : null,
    })),
  };
}

export type TxListItem = FinanceTransaction & {
  category: { name: string; color: string | null } | null;
  account: { name: string; type: string } | null;
  to_account: { name: string } | null;
  event: { name: string } | null;
};

const TX_SELECT =
  "*, category:finance_categories(name,color), account:finance_accounts!finance_transactions_account_id_fkey(name,type), to_account:finance_accounts!finance_transactions_to_account_id_fkey(name), event:events(id,name)";

export async function listTransactions(
  orgId: string,
  opts: { type?: string; status?: string; q?: string; account?: string; event?: string; page: number; pageSize: number },
) {
  const supabase = await createClient();
  let q = supabase.from("finance_transactions").select(TX_SELECT, { count: "exact" }).eq("organization_id", orgId);
  if (opts.type && ["INCOME", "EXPENSE", "TRANSFER"].includes(opts.type)) q = q.eq("type", opts.type);
  if (opts.status === "pending") q = q.eq("is_approved", false);
  if (opts.status === "approved") q = q.eq("is_approved", true);
  if (opts.account && /^[0-9a-f-]{36}$/.test(opts.account)) q = q.or(`account_id.eq.${opts.account},to_account_id.eq.${opts.account}`);
  if (opts.event && /^[0-9a-f-]{36}$/.test(opts.event)) q = q.eq("event_id", opts.event);
  if (opts.q) {
    const term = opts.q.replace(/[%,()*]/g, " ").trim();
    if (term) q = q.or(`description.ilike.%${term}%,transaction_code.ilike.%${term}%`);
  }
  const from = (opts.page - 1) * opts.pageSize;
  const { data, error, count } = await q
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, from + opts.pageSize - 1);
  if (error) throw new Error(error.message);
  return {
    total: count ?? 0,
    items: ((data ?? []) as TxListItem[]).map((t) => ({ ...t, amount: toNumber(t.amount) })),
  };
}

export async function getTransaction(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("finance_transactions").select(TX_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const tx = data as TxListItem & { event: { id: string; name: string } | null };
  const ids = [tx.created_by, tx.approved_by].filter(Boolean) as string[];
  const [people, reversal, signed] = await Promise.all([
    ids.length ? supabase.from("profiles").select("id,full_name").in("id", ids) : Promise.resolve({ data: [] }),
    supabase.from("finance_transactions").select("id,transaction_code").eq("reversal_of", id).maybeSingle(),
    tx.attachment ? supabase.storage.from("attachments").createSignedUrl(tx.attachment, 600) : Promise.resolve({ data: null }),
  ]);
  const names = new Map(((people.data ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));
  const original = tx.reversal_of
    ? ((await supabase.from("finance_transactions").select("id,transaction_code").eq("id", tx.reversal_of).maybeSingle()).data as {
        id: string;
        transaction_code: string;
      } | null)
    : null;
  return {
    ...tx,
    amount: toNumber(tx.amount),
    createdByName: tx.created_by ? names.get(tx.created_by) ?? null : null,
    approvedByName: tx.approved_by ? names.get(tx.approved_by) ?? null : null,
    reversedBy: (reversal.data as { id: string; transaction_code: string } | null) ?? null,
    original,
    attachmentUrl: (signed.data as { signedUrl: string } | null)?.signedUrl ?? null,
  };
}
