"use client";

import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Cetak label" }: { label?: string }) {
  return (
    <Button onClick={() => window.print()} className="no-print">
      <Printer /> {label}
    </Button>
  );
}

export function QrSheet({ units, baseUrl }: { units: { code: string; item: string }[]; baseUrl: string }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 print:grid-cols-4 print:gap-2">
      {units.map((u) => (
        <li key={u.code} className="flex flex-col items-center rounded-2xl border border-dashed border-border-strong bg-white p-3 text-center text-[#16301f] break-inside-avoid print:rounded-none">
          <QRCodeSVG value={`${baseUrl}/inventory/scan/${u.code}`} size={112} level="M" marginSize={0} fgColor="#16301f" />
          <p className="mt-2 font-mono text-base leading-none font-bold">{u.code}</p>
          <p className="mt-1 line-clamp-1 text-[11px]">{u.item}</p>
          <p className="text-[9px] tracking-wider uppercase opacity-70">Pemuda RW 05 Kwarasan</p>
        </li>
      ))}
    </ul>
  );
}
