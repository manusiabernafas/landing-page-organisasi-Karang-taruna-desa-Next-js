import Link from "next/link";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Clock, Eye, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fmtDate, rupiah } from "@/lib/utils/format";
import { PAYMENT_METHOD } from "@/lib/utils/labels";
import { cn } from "@/lib/utils/cn";
import type { TxListItem } from "@/lib/services/finance";

function TypeIcon({ type }: { type: TxListItem["type"] }) {
  const Icon = type === "INCOME" ? ArrowDownLeft : type === "EXPENSE" ? ArrowUpRight : ArrowLeftRight;
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-xl",
        type === "INCOME" && "bg-success-bg text-success",
        type === "EXPENSE" && "bg-danger-bg text-danger",
        type === "TRANSFER" && "bg-sky-100 text-sky-600",
      )}
      aria-hidden
    >
      <Icon className="size-4" />
    </span>
  );
}

function Amount({ t }: { t: TxListItem }) {
  return (
    <span
      className={cn(
        "font-bold whitespace-nowrap tabular",
        t.type === "INCOME" && "text-success",
        t.type === "EXPENSE" && "text-danger",
        t.type === "TRANSFER" && "text-sky-600",
      )}
    >
      {t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "−" : ""}
      {rupiah(t.amount)}
    </span>
  );
}

function Status({ t }: { t: TxListItem }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {t.is_approved ? (
        <Badge tone="green">Disetujui</Badge>
      ) : (
        <Badge tone="gold">
          <Clock className="size-3" aria-hidden /> Menunggu
        </Badge>
      )}
      {t.is_public ? (
        <Badge tone="sky">
          <Eye className="size-3" aria-hidden /> Publik
        </Badge>
      ) : null}
    </span>
  );
}

function subtitle(t: TxListItem) {
  if (t.type === "TRANSFER") return `${t.account?.name ?? "-"} → ${t.to_account?.name ?? "-"}`;
  return [t.category?.name, t.account?.name].filter(Boolean).join(" · ");
}

export function TxList({ items }: { items: TxListItem[] }) {
  return (
    <>
      {/* Mobile: kartu */}
      <ul className="space-y-2 md:hidden">
        {items.map((t) => (
          <li key={t.id}>
            <Link href={`/dashboard/finance/transactions/${t.id}`} className="flex gap-3 rounded-2xl border border-border bg-surface p-3.5 active:bg-surface-2">
              <TypeIcon type={t.type} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-semibold">{t.description ?? t.category?.name ?? "Transaksi"}</p>
                  <Amount t={t} />
                </div>
                <p className="mt-0.5 truncate text-xs text-muted">{subtitle(t)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  <span className="tabular">{fmtDate(t.transaction_date)}</span>
                  <span className="font-mono">{t.transaction_code}</span>
                  <Status t={t} />
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {/* Desktop: tabel */}
      <div className="hidden overflow-x-auto rounded-card border border-border bg-surface md:block">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-bg-soft text-left text-xs font-bold tracking-wider text-muted uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">Transaksi</th>
              <th scope="col" className="px-4 py-3">Tanggal</th>
              <th scope="col" className="px-4 py-3">Akun / Event</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3 text-right">Nominal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((t) => (
              <tr key={t.id} className="group hover:bg-surface-2">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/finance/transactions/${t.id}`} className="flex items-center gap-3">
                    <TypeIcon type={t.type} />
                    <span className="min-w-0">
                      <span className="line-clamp-1 font-semibold group-hover:text-grass-600">{t.description ?? t.category?.name ?? "Transaksi"}</span>
                      <span className="flex items-center gap-1.5 text-xs text-muted">
                        <span className="font-mono">{t.transaction_code}</span>
                        {t.category ? <span>· {t.category.name}</span> : null}
                        {t.attachment ? <Paperclip className="size-3" aria-label="Ada lampiran" /> : null}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted tabular">{fmtDate(t.transaction_date)}</td>
                <td className="px-4 py-3 text-muted">
                  <span className="line-clamp-1">{t.type === "TRANSFER" ? `${t.account?.name} → ${t.to_account?.name}` : t.account?.name}</span>
                  <span className="text-xs">{t.event?.name ?? PAYMENT_METHOD[t.payment_method]}</span>
                </td>
                <td className="px-4 py-3">
                  <Status t={t} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Amount t={t} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
