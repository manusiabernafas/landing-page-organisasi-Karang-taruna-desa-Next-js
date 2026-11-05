import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { BasecampScene } from "@/components/illustrations/basecamp-scene";
import { DEMO_ACCOUNTS, DEMO_MODE } from "@/lib/config";

export const metadata: Metadata = { title: "Masuk Basecamp", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const notice =
    sp.error === "no-org"
      ? "Akun Anda belum dihubungkan ke Pemuda RW 05. Hubungi Super Admin basecamp."
      : sp.error === "link"
        ? "Tautan sudah kedaluwarsa atau tidak valid. Silakan minta tautan baru."
        : sp.keluar
          ? "Anda sudah keluar dari basecamp. Sampai jumpa lagi!"
          : sp.reset
            ? "Password berhasil diganti. Silakan masuk dengan password baru."
            : null;
  return (
    <div>
      <div className="mb-6 overflow-hidden rounded-3xl border border-border lg:hidden">
        <BasecampScene />
      </div>
      <p className="text-xs font-bold tracking-[0.16em] text-grass-600 uppercase">BASECAMP PEMUDA RW 05</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Masuk Basecamp</h1>
      <p className="mt-2 text-sm text-muted">Khusus pengurus, panitia, dan anggota Pemuda RW 05 Kwarasan.</p>
      {notice ? (
        <p role="status" className="mt-5 rounded-xl border border-border bg-bg-soft px-4 py-3 text-sm text-text">
          {notice}
        </p>
      ) : null}
      <LoginForm
        next={next}
        // Password demo dibaca di server (bukan NEXT_PUBLIC) dan hanya dikirim saat mode demo aktif.
        demo={DEMO_MODE && process.env.DEMO_PASSWORD ? { password: process.env.DEMO_PASSWORD, accounts: [...DEMO_ACCOUNTS] } : undefined}
      />
    </div>
  );
}
