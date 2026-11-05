import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes, HandHelping, History, MapPin, QrCode, Settings2, Wrench } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { PublicUnavailable } from "@/components/landing/public-unavailable";
import { ConditionBadge, UnitStatusBadge } from "@/components/inventory/unit-badges";
import { lookupUnit } from "@/lib/services/public";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/config";

export async function generateMetadata({ params }: PageProps<"/inventory/scan/[code]">): Promise<Metadata> {
  const { code } = await params;
  return { title: `Unit ${decodeURIComponent(code).toUpperCase()}`, robots: { index: false } };
}

export default async function ScanPage({ params }: PageProps<"/inventory/scan/[code]">) {
  const { code: raw } = await params;
  const code = decodeURIComponent(raw).toUpperCase().slice(0, 20);
  const res = await lookupUnit(code);
  if (res.error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <PublicUnavailable what="inventaris" />
      </div>
    );
  }
  if (!res.data) notFound();
  const unit = res.data;
  const session = isSupabaseConfigured() ? await getSession().catch(() => null) : null;
  const canManage = can(session?.profile.role, "inventory.manage");
  const canRequest = can(session?.profile.role, "borrowing.request");

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <div className="overflow-hidden rounded-[26px] border border-border bg-surface shadow-soft">
        <div className="relative flex aspect-[16/10] items-center justify-center bg-wood-100">
          {unit.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={unit.photoUrl} alt={unit.item_name} className="h-full w-full object-cover" />
          ) : (
            <ResourceIcon tone="wood" size="lg">
              <Boxes />
            </ResourceIcon>
          )}
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-forest/85 px-3 py-1.5 font-mono text-sm font-bold text-white">
            <QrCode className="size-4" aria-hidden /> {unit.unit_code}
          </span>
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-xs font-bold tracking-[0.14em] text-muted uppercase">{unit.category ?? "Inventaris"} · Pemuda RW 05</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold">{unit.item_name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <UnitStatusBadge status={unit.status} />
            <ConditionBadge condition={unit.condition} />
          </div>
          {unit.location ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted">
              <MapPin className="size-4" aria-hidden /> Tempat simpan: {unit.location}
            </p>
          ) : null}

          {canManage ? (
            <div className="mt-6 grid grid-cols-2 gap-2">
              <ButtonLink href={`/dashboard/borrowings/new?unit=${unit.unit_code}`} size="lg" className="col-span-2">
                <HandHelping /> Pinjamkan unit ini
              </ButtonLink>
              <ButtonLink href={`/dashboard/inventory/units/${unit.unit_code}#aksi`} variant="secondary" size="lg">
                <Wrench /> Kondisi
              </ButtonLink>
              <ButtonLink href={`/dashboard/inventory/units/${unit.unit_code}#histori`} variant="secondary" size="lg">
                <History /> Histori
              </ButtonLink>
              <ButtonLink href={`/dashboard/inventory/units/${unit.unit_code}`} variant="ghost" size="md" className="col-span-2">
                <Settings2 /> Kelola lengkap (kembalikan, maintenance)
              </ButtonLink>
            </div>
          ) : canRequest ? (
            <ButtonLink href={`/dashboard/borrowings/new?unit=${unit.unit_code}`} size="lg" className="mt-6 w-full">
              <HandHelping /> Ajukan peminjaman
            </ButtonLink>
          ) : (
            <p className="mt-6 rounded-2xl bg-bg-soft p-4 text-sm text-muted">
              Mau pinjam barang ini? Hubungi pengurus Pemuda RW 05 atau{" "}
              <Link href={`/login?next=/inventory/scan/${unit.unit_code}`} className="font-semibold text-grass-600 underline">
                masuk basecamp
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
