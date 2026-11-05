import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getFormOptions, getTransaction } from "@/lib/services/finance";
import { Card, CardBody } from "@/components/ui/card";
import { TransactionForm } from "@/components/finance/transaction-form";

export const metadata: Metadata = { title: "Ubah Transaksi" };

export default async function EditTransactionPage({ params }: PageProps<"/dashboard/finance/transactions/[id]/edit">) {
  const session = await requirePermission("finance.create");
  const { id } = await params;
  const [tx, opts] = await Promise.all([getTransaction(id), getFormOptions(session.organization.id)]);
  if (!tx) notFound();
  if (tx.is_approved) redirect(`/dashboard/finance/transactions/${id}`);
  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/dashboard/finance/transactions/${id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Kembali
      </Link>
      <h2 className="mt-3 font-display text-xl font-bold">
        Ubah transaksi <span className="font-mono text-base text-muted">{tx.transaction_code}</span>
      </h2>
      <Card className="mt-4">
        <CardBody>
          <TransactionForm
            editId={id}
            hasAttachment={Boolean(tx.attachment)}
            categories={opts.categories}
            accounts={opts.accounts}
            canApprove={can(session.profile.role, "finance.approve")}
            defaults={{
              type: tx.type,
              transaction_date: tx.transaction_date,
              amount: tx.amount,
              account_id: tx.account_id,
              to_account_id: tx.to_account_id ?? undefined,
              category_id: tx.category_id ?? undefined,
              description: tx.description ?? "",
              payment_method: tx.payment_method,
              approve_now: false,
              is_public: tx.is_public,
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
