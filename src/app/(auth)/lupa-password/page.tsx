import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Lupa Password", robots: { index: false } };

export default function ForgotPage() {
  return (
    <div>
      <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Kembali ke login
      </Link>
      <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight">Lupa password?</h1>
      <p className="mt-2 text-sm text-muted">Masukkan email akun basecamp Anda. Kami kirim tautan untuk mengatur ulang password.</p>
      <ForgotForm />
    </div>
  );
}
