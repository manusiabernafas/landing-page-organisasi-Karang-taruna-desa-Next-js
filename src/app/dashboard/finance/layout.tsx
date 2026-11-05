import { Wallet } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/ui/states";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { SubNav } from "@/components/dashboard/sub-nav";

export default async function FinanceLayout({ children }: LayoutProps<"/dashboard/finance">) {
  await requirePermission("finance.view");
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Keuangan"
        title="Kas Pemuda RW 05"
        description="Saldo dihitung dari transaksi yang disetujui. Setiap perubahan penting tercatat di audit log."
        icon={
          <ResourceIcon tone="gold" size="lg">
            <Wallet />
          </ResourceIcon>
        }
      />
      <SubNav
        label="Menu keuangan"
        items={[
          { href: "/dashboard/finance", label: "Overview" },
          { href: "/dashboard/finance/transactions?type=INCOME", label: "Pemasukan", match: { path: "/dashboard/finance/transactions", query: { type: "INCOME" } } },
          { href: "/dashboard/finance/transactions?type=EXPENSE", label: "Pengeluaran", match: { path: "/dashboard/finance/transactions", query: { type: "EXPENSE" } } },
          { href: "/dashboard/finance/transactions", label: "Semua Transaksi", match: { path: "/dashboard/finance/transactions", query: { type: null } } },
          { href: "/dashboard/finance/categories", label: "Kategori" },
          { href: "/dashboard/finance/accounts", label: "Akun Kas" },
          { href: "/dashboard/finance/ledger", label: "Buku Kas" },
          { href: "/dashboard/dues", label: "Iuran", match: { path: "/dashboard/dues", prefix: true } },
          { href: "/dashboard/reports?report=kas", label: "Laporan", match: { path: "/dashboard/reports" } },
        ]}
      />
      {children}
    </div>
  );
}
