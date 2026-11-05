import { EmptyState } from "@/components/ui/states";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState illustration="camp" title="Halaman tidak ditemukan." description="Mungkin tautannya sudah berubah. Yuk kembali ke basecamp." action={{ label: "Kembali ke beranda", href: "/" }} />
    </div>
  );
}
