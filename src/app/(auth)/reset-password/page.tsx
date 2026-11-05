import type { Metadata } from "next";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Atur Ulang Password", robots: { index: false } };

export default function ResetPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Atur password baru</h1>
      <p className="mt-2 text-sm text-muted">Gunakan minimal 8 karakter. Jangan pakai password yang sama dengan akun lain.</p>
      <ResetForm />
    </div>
  );
}
