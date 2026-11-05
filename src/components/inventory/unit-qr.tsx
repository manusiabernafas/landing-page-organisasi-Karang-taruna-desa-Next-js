"use client";

import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UnitQr({ code, url, itemName, size = 168 }: { code: string; url: string; itemName: string; size?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  function download() {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const scale = 4;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const pad = 24 * scale;
      canvas.width = size * scale + pad * 2;
      canvas.height = size * scale + pad * 2 + 40 * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, pad, pad, size * scale, size * scale);
      ctx.fillStyle = "#16301f";
      ctx.textAlign = "center";
      ctx.font = `bold ${16 * scale}px monospace`;
      ctx.fillText(code, canvas.width / 2, size * scale + pad + 22 * scale);
      ctx.font = `${10 * scale}px sans-serif`;
      ctx.fillText(`${itemName} · Pemuda RW 05`, canvas.width / 2, size * scale + pad + 36 * scale);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `QR-${code}.png`;
      a.click();
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  }

  return (
    <div className="flex flex-col items-center">
      <div ref={ref} className="rounded-2xl bg-white p-3 shadow-soft-sm ring-1 ring-border">
        <QRCodeSVG value={url} size={size} level="M" marginSize={0} fgColor="#16301f" bgColor="#ffffff" title={`QR ${code}`} />
      </div>
      <p className="mt-2 font-mono text-lg font-bold">{code}</p>
      <p className="max-w-[220px] truncate text-center text-xs break-all text-muted">{url.replace(/^https?:\/\//, "")}</p>
      <Button variant="ghost" size="sm" className="mt-1" onClick={download}>
        <Download /> Unduh PNG
      </Button>
    </div>
  );
}
