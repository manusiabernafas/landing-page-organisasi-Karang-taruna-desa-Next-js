import { ImageResponse } from "next/og";

export const alt = "BASECAMP PEMUDA RW 05 — Kwarasan, Nogotirto, Gamping, Sleman";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#16301f", color: "#fbf7ee", fontFamily: "sans-serif", position: "relative" }}>
        <svg width="1200" height="630" viewBox="0 0 1200 630" style={{ position: "absolute", inset: 0 }}>
          <rect width="1200" height="630" fill="#16301f" />
          <circle cx="1030" cy="130" r="60" fill="#f2b632" opacity="0.9" />
          <path d="M560 470 Q700 380 780 300 L820 262 Q840 248 860 262 L900 300 Q990 380 1200 470 V630 H560 Z" fill="#2c4a37" />
          <path d="M0 520 Q300 460 600 500 T1200 490 V630 H0 Z" fill="#3e9b4f" />
          <path d="M820 560 L930 420 L1040 560 Z" fill="#f2b632" />
          <path d="M930 420 L1040 560 L990 560 Z" fill="#c98d0f" />
          <rect x="928" y="370" width="4" height="52" fill="#fbf7ee" />
          <path d="M932 372 L970 384 L932 396 Z" fill="#e0493c" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", padding: "72px 80px", position: "relative" }}>
          <div style={{ fontSize: 26, letterSpacing: 4, color: "#f2b632", fontWeight: 700 }}>BASECAMP PEMUDA RW 05</div>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, marginTop: 24, maxWidth: 760 }}>Bangun Kegiatan. Kelola Kas. Gerakkan Pemuda.</div>
          <div style={{ fontSize: 28, marginTop: 28, color: "#b9cbb8" }}>Kwarasan • Nogotirto • Gamping • Sleman</div>
        </div>
      </div>
    ),
    size,
  );
}
