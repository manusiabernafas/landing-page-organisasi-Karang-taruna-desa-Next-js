"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScanState = "idle" | "starting" | "scanning" | "denied" | "unsupported" | "error" | "found";

/** Ambil kode unit dari hasil scan (URL /inventory/scan/KODE atau kode mentah). */
function extractCode(text: string) {
  const m = text.match(/\/inventory\/scan\/([A-Za-z0-9-]{3,20})/);
  const raw = m ? m[1] : text.trim();
  return /^[A-Za-z]{2,5}-\d{1,4}$/.test(raw) ? raw.toUpperCase() : null;
}

export function QrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [state, setState] = useState<ScanState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function start() {
    setMessage(null);
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setState("unsupported");
      return;
    }
    setState("starting");
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250 });
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        videoRef.current!,
        (result) => {
          if (!result) return;
          const code = extractCode(result.getText());
          if (code) {
            setState("found");
            controlsRef.current?.stop();
            if (navigator.vibrate) navigator.vibrate(60);
            router.push(`/dashboard/inventory/units/${code}`);
          } else {
            setMessage("QR terbaca, tetapi bukan QR inventaris Pemuda RW 05.");
          }
        },
      );
      controlsRef.current = controls;
      setState("scanning");
    } catch (e) {
      const name = (e as { name?: string })?.name;
      setState(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
    }
  }

  function stop() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setState("idle");
  }

  useEffect(() => () => controlsRef.current?.stop(), []);

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <div className="relative aspect-square max-h-[70dvh] w-full bg-forest sm:aspect-video">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline aria-label="Kamera pemindai QR" />
        {state === "scanning" ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
            <div className="relative size-56 rounded-3xl border-4 border-gold/90 shadow-[0_0_0_9999px_rgb(11_20_15/0.45)]">
              <div className="anim-lamp absolute inset-x-4 top-1/2 h-0.5 bg-gold" />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
            {state === "starting" ? <p>Menyalakan kamera…</p> : null}
            {state === "found" ? <p className="font-semibold">Unit ditemukan! Membuka…</p> : null}
            {state === "idle" ? (
              <>
                <Camera className="size-10 text-gold" aria-hidden />
                <p className="max-w-xs text-sm text-white/80">Arahkan kamera ke QR yang tertempel di barang.</p>
              </>
            ) : null}
            {state === "denied" ? (
              <>
                <CameraOff className="size-10 text-gold" aria-hidden />
                <p className="max-w-xs text-sm">Izin kamera ditolak. Izinkan akses kamera di pengaturan browser, atau ketik kode unit di bawah.</p>
              </>
            ) : null}
            {state === "unsupported" ? (
              <>
                <CameraOff className="size-10 text-gold" aria-hidden />
                <p className="max-w-xs text-sm">Kamera tidak tersedia di perangkat/browser ini (butuh HTTPS). Ketik kode unit di bawah.</p>
              </>
            ) : null}
            {state === "error" ? <p className="max-w-xs text-sm">Kamera belum berhasil dinyalakan. Coba lagi.</p> : null}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 p-4">
        {state === "scanning" ? (
          <Button variant="secondary" onClick={stop}>
            <CameraOff /> Matikan kamera
          </Button>
        ) : (
          <Button onClick={start} loading={state === "starting"} size="lg" className="w-full sm:w-auto">
            {state === "error" || state === "denied" ? <RefreshCw /> : <Camera />} {state === "error" || state === "denied" ? "Coba lagi" : "Mulai scan"}
          </Button>
        )}
        {message ? (
          <p role="status" className="text-sm text-warning">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
