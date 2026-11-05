import Link from "next/link";
import { MapPin } from "lucide-react";
import { LogoMark } from "@/components/illustrations/logo";
import { ORG_LOCATION_FULL, TAGLINE } from "@/lib/config";

const menu = [
  { href: "/#tentang", label: "Tentang" },
  { href: "/kegiatan", label: "Kegiatan" },
  { href: "/transparansi", label: "Transparansi" },
  { href: "/dokumentasi", label: "Dokumentasi" },
  { href: "/login", label: "Login Pengurus" },
];

export function PublicFooter() {
  return (
    <footer className="relative mt-20 overflow-hidden bg-forest text-[#e9f1e6]">
      <svg viewBox="0 0 1440 60" className="absolute -top-px left-0 h-8 w-full text-bg sm:h-12" preserveAspectRatio="none" aria-hidden>
        <path d="M0 0 H1440 V18 Q1260 58 1080 30 T720 34 T360 26 T0 40 Z" fill="currentColor" />
      </svg>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-20 pb-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <LogoMark size={44} />
            <div>
              <p className="font-display text-lg font-extrabold tracking-tight text-white">BASECAMP PEMUDA RW 05</p>
              <p className="text-sm text-[#b9cbb8]">Kwarasan • Nogotirto • Gamping • Sleman</p>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-[#b9cbb8]">{TAGLINE} Satu basecamp untuk kegiatan, kas, inventaris, dan cerita Pemuda RW 05.</p>
        </div>
        <nav aria-label="Menu footer">
          <p className="text-xs font-bold tracking-[0.14em] text-[#f2b632] uppercase">Menu</p>
          <ul className="mt-4 space-y-2.5">
            {menu.map((m) => (
              <li key={m.href}>
                <Link href={m.href} className="text-sm text-[#dbe6d8] hover:text-white hover:underline">
                  {m.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#f2b632] uppercase">Sekretariat</p>
          <p className="mt-4 flex gap-2 text-sm leading-relaxed text-[#dbe6d8]">
            <MapPin className="mt-0.5 size-4 shrink-0 text-[#f2b632]" aria-hidden />
            Sekretariat Pemuda RW 05, {ORG_LOCATION_FULL}
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-[#9fb39e] sm:flex-row sm:px-6 lg:px-8">
          <p>Made for Pemuda RW 05 Kwarasan.</p>
          <p>Dikelola bersama oleh pengurus Pemuda RW 05 · {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  );
}
