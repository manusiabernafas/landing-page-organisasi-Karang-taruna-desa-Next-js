import { Coins } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/states";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { SubNav } from "@/components/dashboard/sub-nav";

export default async function DuesLayout({ children }: LayoutProps<"/dashboard/dues">) {
  const session = await requireSession();
  const full = can(session.profile.role, "dues.view");
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Iuran Pemuda"
        title={full ? "Buku iuran bulanan" : "Iuran saya"}
        description={
          full
            ? "Setiap tagihan (perorangan atau kakak-adik serumah) punya nominal sendiri. Pembayaran otomatis masuk kas pemuda."
            : "Status iuran bulanan rumah Anda. Pembayaran dicatat oleh bendahara."
        }
        icon={
          <ResourceIcon tone="grass" size="lg">
            <Coins />
          </ResourceIcon>
        }
      />
      {full ? (
        <SubNav
          label="Menu iuran"
          items={[
            { href: "/dashboard/dues", label: "Tagihan bulanan" },
            { href: "/dashboard/dues/card", label: "Kartu iuran setahun" },
            { href: "/dashboard/dues/households", label: "Daftar tagihan", match: { path: "/dashboard/dues/households", prefix: true } },
            { href: "/dashboard/finance/ledger", label: "Buku kas" },
          ]}
        />
      ) : null}
      {children}
    </div>
  );
}
