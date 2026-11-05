import type { Metadata } from "next";
import { CalendarRange } from "lucide-react";
import { EventCard } from "@/components/events/event-card";
import { LinkTabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/states";
import { SectionHeading } from "@/components/landing/section-heading";
import { getPublicEvents } from "@/lib/services/public";
import { PublicUnavailable } from "@/components/landing/public-unavailable";

export const metadata: Metadata = {
  title: "Kegiatan",
  description: "Jadwal kegiatan dan event Pemuda RW 05 Kwarasan: Gebyar Kemerdekaan, kerja bakti, turnamen futsal, bakti sosial, dan lainnya.",
  alternates: { canonical: "/kegiatan" },
};

export default async function KegiatanPage({ searchParams }: PageProps<"/kegiatan">) {
  const sp = await searchParams;
  const tab = sp.tab === "selesai" ? "past" : "upcoming";
  const events = await getPublicEvents(tab, 48);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <SectionHeading
        eyebrow="Kegiatan Pemuda RW 05"
        title="Semua quest basecamp"
        description="Event dan kegiatan terbuka untuk warga Kwarasan. Klik kegiatan untuk melihat jadwal, progres persiapan, dan anggaran."
      />
      <LinkTabs
        className="mt-8"
        label="Filter kegiatan"
        active={tab}
        tabs={[
          { key: "upcoming", label: "Mendatang", href: "/kegiatan", icon: <CalendarRange /> },
          { key: "past", label: "Sudah terlaksana", href: "/kegiatan?tab=selesai" },
        ]}
      />
      <div className="mt-6">
        {!events.data ? (
          <PublicUnavailable what="kegiatan" />
        ) : events.data.length === 0 ? (
          <EmptyState
            illustration="calendar"
            title={tab === "upcoming" ? "Belum ada event." : "Belum ada kegiatan yang selesai."}
            description={tab === "upcoming" ? "Basecamp masih tenang. Kegiatan berikutnya segera diumumkan." : "Riwayat kegiatan publik akan tampil di sini."}
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.data.map((e, i) => (
              <li key={e.id}>
                <EventCard event={e} href={`/kegiatan/${e.slug}`} coverUrl={e.coverUrl} index={i} showBudget />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
