"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, LogIn } from "lucide-react";
import { Wordmark } from "@/components/illustrations/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const links = [
  { href: "/#tentang", label: "Tentang" },
  { href: "/kegiatan", label: "Kegiatan" },
  { href: "/transparansi", label: "Transparansi" },
  { href: "/dokumentasi", label: "Dokumentasi" },
];

export function PublicNavbar({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/85 backdrop-blur-md">
      <a href="#konten" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">
        Lewati ke konten
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Beranda BASECAMP PEMUDA RW 05" onClick={() => setOpen(false)}>
          <Wordmark className="hidden sm:flex" />
          <Wordmark compact className="sm:hidden" />
        </Link>
        <nav aria-label="Navigasi utama" className="hidden items-center gap-1 lg:flex">
          {links.map((l) => {
            const active = l.href !== "/#tentang" && pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  active ? "bg-grass-100 text-grass-600" : "text-muted hover:bg-bg-soft hover:text-text",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link href={loggedIn ? "/dashboard" : "/login"} className={buttonClass("primary", "sm", "hidden sm:inline-flex")}>
            <LogIn /> {loggedIn ? "Buka Basecamp" : "Masuk Basecamp"}
          </Link>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-xl hover:bg-bg-soft lg:hidden"
            aria-expanded={open}
            aria-controls="public-mobile-menu"
            aria-label={open ? "Tutup menu" : "Buka menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
    </header>
    {/* Di luar <header>: backdrop-blur pada header membuat elemen `fixed` di dalamnya
        diukur dari header (tinggi 64px), bukan dari layar, sehingga menu terpotong. */}
      {open ? (
        <div id="public-mobile-menu" className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-border bg-bg px-4 py-5 lg:hidden">
          <nav aria-label="Navigasi seluler" className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3.5 text-base font-semibold text-text hover:bg-bg-soft"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <Link href={loggedIn ? "/dashboard" : "/login"} onClick={() => setOpen(false)} className={buttonClass("primary", "lg", "mt-5 w-full")}>
            <LogIn /> {loggedIn ? "Buka Basecamp" : "Masuk Basecamp"}
          </Link>
          <p className="mt-6 text-center text-xs text-muted">Kwarasan • Nogotirto • Gamping • Sleman</p>
        </div>
      ) : null}
    </>
  );
}
