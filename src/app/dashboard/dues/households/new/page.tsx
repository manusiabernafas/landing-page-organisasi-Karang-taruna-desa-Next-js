import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { getHouseholdsForManage } from "@/lib/services/dues";
import { Card, CardBody } from "@/components/ui/card";
import { HouseholdForm } from "@/components/dues/household-form";

export const metadata: Metadata = { title: "Tagihan Baru" };

export default async function NewHouseholdPage() {
  const session = await requirePermission("households.manage");
  const { houses, members } = await getHouseholdsForManage(session.organization.id);
  const names = new Map(houses.map((h) => [h.id, h.name]));
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/dues/households" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Daftar tagihan
      </Link>
      <h2 className="mt-3 font-display text-xl font-bold">Tagihan baru</h2>
      <p className="text-sm text-muted">Untuk kakak-adik serumah, pilih semua anggotanya di satu tagihan dengan satu nominal.</p>
      <Card className="mt-4">
        <CardBody>
          <HouseholdForm
            defaults={{ name: "", address: "", monthly_fee: 10000, is_active: true, host_eligible: true, notes: "", member_ids: [] }}
            members={members.map((m) => ({ ...m, household_name: m.household_id ? names.get(m.household_id) ?? null : null }))}
          />
        </CardBody>
      </Card>
    </div>
  );
}
