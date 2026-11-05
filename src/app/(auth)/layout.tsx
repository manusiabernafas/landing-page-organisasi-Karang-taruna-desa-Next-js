import Link from "next/link";
import { BasecampScene } from "@/components/illustrations/basecamp-scene";
import { Wordmark } from "@/components/illustrations/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-forest p-10 text-white lg:flex lg:flex-col">
        <Link href="/" className="relative z-10 flex items-center gap-3" aria-label="Kembali ke beranda">
          <span className="rounded-2xl bg-white/10 p-1.5">
            <Wordmark compact className="[&_span]:text-white [&_.text-grass-600]:text-gold" />
          </span>
        </Link>
        <div className="relative z-10 mt-auto">
          <div className="overflow-hidden rounded-[26px] border-4 border-white/10 shadow-2xl">
            <BasecampScene title="Basecamp Pemuda RW 05 di malam hari" />
          </div>
          <p className="mt-8 font-display text-3xl leading-tight font-extrabold">
            Basecamp RW 05 siap bergerak hari ini.
          </p>
          <p className="mt-2 max-w-md text-[#b9cbb8]">Masuk untuk mengelola kegiatan, kas, inventaris, dan cerita Pemuda RW 05 Kwarasan.</p>
        </div>
      </aside>
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 sm:px-8 sm:pt-6">
          <Link href="/" aria-label="Beranda" className="lg:invisible">
            <Wordmark compact />
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <p className="pb-6 text-center text-xs text-muted">Kwarasan • Nogotirto • Gamping • Sleman</p>
      </div>
    </div>
  );
}
