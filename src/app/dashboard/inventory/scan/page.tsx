import type { Metadata } from "next";
import { Search } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { QrScanner } from "@/components/inventory/qr-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { goToUnitAction } from "@/lib/actions/inventory";

export const metadata: Metadata = { title: "Scan QR" };

export default async function ScanPage({ searchParams }: PageProps<"/dashboard/inventory/scan">) {
  await requireSession();
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <QrScanner />
      <form action={goToUnitAction} className="rounded-card border border-border bg-surface p-4">
        <label htmlFor="code" className="mb-1.5 block text-sm font-semibold">
          Atau ketik kode unit
        </label>
        <div className="flex gap-2">
          <Input id="code" name="code" placeholder="TND-004" className="font-mono uppercase" autoCapitalize="characters" autoComplete="off" required maxLength={20} />
          <Button type="submit">
            <Search /> Buka
          </Button>
        </div>
        {sp.error ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            Kode unit belum diisi.
          </p>
        ) : null}
      </form>
    </div>
  );
}
