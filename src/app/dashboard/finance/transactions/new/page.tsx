import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getFormOptions } from "@/lib/services/finance";
import { todayJakarta } from "@/lib/utils/format";
import { Card, CardBody } from "@/components/ui/card";
import { TransactionForm } from "@/components/finance/transaction-form";

export const metadata: Metadata = { title: "Catat Transaksi" };

export default async function NewTransactionPage({ searchParams }: PageProps<"/dashboard/finance/transactions/new">) {
  const session = await requirePermission("finance.create");
  const sp = await searchParams;
  const opts = await getFormOptions(session.organization.id);
  const type = sp.type === "EXPENSE" || sp.type === "TRANSFER" ? sp.type : "INCOME";
  const eventAccount = typeof sp.event === "string" ? opts.accounts.find((a) => a.event_id === sp.event) : undefined;
  const defaultAccount = eventAccount ?? opts.accounts.find((a) => a.type === "CASH" && a.is_active) ?? opts.accounts.find((a) => a.type !== "EVENT");
  return (
    <div className="mx-auto max-w-2xl">
      <Link href={eventAccount ? `/dashboard/events/${eventAccount.event_id}?tab=finance` : "/dashboard/finance/transactions"} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Kembali
      </Link>
      <h2 className="mt-3 font-display text-xl font-bold">
        Catat transaksi{eventAccount?.eventName ? ` · ${eventAccount.eventName}` : ""}
      </h2>
      <Card className="mt-4">
        <CardBody>
          <TransactionForm
            categories={opts.categories}
            accounts={opts.accounts}
            canApprove={can(session.profile.role, "finance.approve")}
            defaults={{
              type,
              transaction_date: todayJakarta(),
              account_id: defaultAccount?.id,
              payment_method: type === "INCOME" ? "CASH" : type === "TRANSFER" ? "TRANSFER" : "CASH",
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
