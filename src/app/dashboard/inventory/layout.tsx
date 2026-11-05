import { Boxes } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/states";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { SubNav } from "@/components/dashboard/sub-nav";

export default async function InventoryLayout({ children }: LayoutProps<"/dashboard/inventory">) {
  await requireSession();
  return (
    <div className="space-y-5">
      <div className="no-print">
      <PageHeader
        eyebrow="Inventaris"
        title="Gudang resource basecamp"
        description="Setiap unit punya kode, QR, kondisi, dan riwayatnya sendiri. Stok tersedia dihitung otomatis dari status unit."
        icon={
          <ResourceIcon tone="wood" size="lg">
            <Boxes />
          </ResourceIcon>
        }
      />
      </div>
      <SubNav
        label="Menu inventaris"
        items={[
          { href: "/dashboard/inventory", label: "Semua Barang" },
          { href: "/dashboard/inventory/categories", label: "Kategori" },
          { href: "/dashboard/inventory/units", label: "Unit Barang" },
          { href: "/dashboard/borrowings", label: "Peminjaman", match: { path: "/dashboard/borrowings", query: { status: null } } },
          { href: "/dashboard/borrowings?status=BORROWED", label: "Pengembalian", match: { path: "/dashboard/borrowings", query: { status: "BORROWED" } } },
          { href: "/dashboard/inventory/maintenance", label: "Maintenance" },
          { href: "/dashboard/inventory/qr", label: "QR Code" },
          { href: "/dashboard/inventory/scan", label: "Scan" },
        ]}
      />
      {children}
    </div>
  );
}
