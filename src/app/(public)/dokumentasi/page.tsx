import type { Metadata } from "next";
import { SectionHeading } from "@/components/landing/section-heading";
import { PublicUnavailable } from "@/components/landing/public-unavailable";
import { Gallery } from "@/components/documentation/gallery";
import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { getPublicDocuments } from "@/lib/services/public";
import { fmtDate } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Dokumentasi",
  description: "Galeri foto kegiatan Pemuda RW 05 Kwarasan, Nogotirto, Gamping, Sleman.",
  alternates: { canonical: "/dokumentasi" },
};

const PER_PAGE = 24;

export default async function DokumentasiPage({ searchParams }: PageProps<"/dokumentasi">) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const docs = await getPublicDocuments(PER_PAGE, (page - 1) * PER_PAGE);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <SectionHeading eyebrow="Dokumentasi" title="Cerita dari lapangan" description="Foto-foto kegiatan yang dipilih pengurus untuk dibagikan ke warga." />
      <div className="mt-8">
        {!docs.data ? (
          <PublicUnavailable what="dokumentasi" />
        ) : docs.data.items.length === 0 ? (
          <EmptyState illustration="photo" title="Belum ada foto yang dipublikasikan." description="Galeri akan terisi setelah pengurus membagikan dokumentasi kegiatan." />
        ) : (
          <div className="space-y-8">
            <Gallery
              items={docs.data.items.map((d) => ({
                id: d.id,
                url: d.url,
                caption: d.caption,
                width: d.width,
                height: d.height,
                meta: [d.event_name, d.taken_at ? fmtDate(d.taken_at) : null].filter(Boolean).join(" · "),
              }))}
            />
            <Pagination page={page} pageSize={PER_PAGE} total={docs.data.total} makeHref={(p) => `/dokumentasi?page=${p}`} />
          </div>
        )}
      </div>
    </div>
  );
}
