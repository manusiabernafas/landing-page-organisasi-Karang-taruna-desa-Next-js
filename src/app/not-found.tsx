import { EmptyState } from "@/components/ui/states";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl items-center px-4 py-16">
      <EmptyState className="w-full" illustration="camp" title="Halaman tidak ditemukan." description="Mungkin tautannya sudah berubah. Yuk kembali ke basecamp." action={{ label: "Kembali ke beranda", href: "/" }} />
    </main>
  );
}
