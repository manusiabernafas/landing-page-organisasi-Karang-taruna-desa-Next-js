import { HandHelping } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/states";
import { ResourceIcon } from "@/components/ui/resource-icon";

export default async function BorrowingsLayout({ children }: LayoutProps<"/dashboard/borrowings">) {
  await requireSession();
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Peminjaman"
        title="Pinjam-meminjam perlengkapan"
        description="Alur: pengajuan → persetujuan → serah terima → pengembalian & inspeksi kondisi. Stok unit berubah otomatis di setiap langkah."
        icon={
          <ResourceIcon tone="sky" size="lg">
            <HandHelping />
          </ResourceIcon>
        }
      />
      {children}
    </div>
  );
}
