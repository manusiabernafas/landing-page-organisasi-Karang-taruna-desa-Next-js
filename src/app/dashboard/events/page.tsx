import type { Metadata } from "next";
import { CalendarDays, CalendarPlus, PartyPopper } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { listEvents, type EventFilter } from "@/lib/services/events";
import { pct } from "@/lib/utils/format";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/ui/states";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { SearchInput } from "@/components/ui/search-input";
import { Pagination } from "@/components/ui/pagination";
import { SubNav } from "@/components/dashboard/sub-nav";
import { EventCard } from "@/components/events/event-card";

export const metadata: Metadata = { title: "Event" };
const PER_PAGE = 12;

export default async function EventsPage({ searchParams }: PageProps<"/dashboard/events">) {
  const session = await requireSession();
  const sp = await searchParams;
  const tab = (["upcoming", "ongoing", "completed"].includes(String(sp.tab)) ? sp.tab : "all") as EventFilter;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const res = await listEvents(session.organization.id, { filter: tab, q, page, pageSize: PER_PAGE });
  const canCreate = can(session.profile.role, "event.create");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Event & Kegiatan"
        title="Papan quest Pemuda RW 05"
        description="Setiap event adalah quest: siapkan panitia, selesaikan checklist, kelola dana, dan abadikan ceritanya."
        icon={
          <ResourceIcon tone="grass" size="lg">
            <PartyPopper />
          </ResourceIcon>
        }
        actions={
          canCreate ? (
            <ButtonLink href="/dashboard/events/new" variant="gold">
              <CalendarPlus /> Buat Event
            </ButtonLink>
          ) : null
        }
      />
      <SubNav
        label="Filter event"
        items={[
          { href: "/dashboard/events", label: "Semua Event", match: { path: "/dashboard/events", query: { tab: null } } },
          { href: "/dashboard/events?tab=upcoming", label: "Mendatang", match: { path: "/dashboard/events", query: { tab: "upcoming" } } },
          { href: "/dashboard/events?tab=ongoing", label: "Berlangsung", match: { path: "/dashboard/events", query: { tab: "ongoing" } } },
          { href: "/dashboard/events?tab=completed", label: "Selesai", match: { path: "/dashboard/events", query: { tab: "completed" } } },
          { href: "/dashboard/events/calendar", label: "Calendar" },
        ]}
      />
      {sp.deleted ? (
        <p role="status" className="rounded-xl bg-bg-soft px-4 py-3 text-sm">
          Event sudah dihapus.
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput placeholder="Cari nama event atau lokasi…" className="sm:max-w-md sm:flex-1" />
        <ButtonLink href="/dashboard/events/calendar" variant="secondary" className="sm:ml-auto">
          <CalendarDays /> Lihat kalender
        </ButtonLink>
      </div>
      {res.items.length === 0 ? (
        <EmptyState
          illustration="calendar"
          title={q ? "Event tidak ditemukan." : "Belum ada event."}
          description={q ? "Coba kata kunci lain." : "Basecamp masih tenang. Yuk buat kegiatan pertama."}
          action={canCreate && !q ? { label: "Buat Event", href: "/dashboard/events/new" } : undefined}
        />
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {res.items.map((e, i) => (
              <li key={e.id}>
                <EventCard event={e} href={`/dashboard/events/${e.id}`} progress={pct(e.progress.done, e.progress.total)} coverUrl={e.coverUrl} index={i} showBudget />
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            pageSize={PER_PAGE}
            total={res.total}
            makeHref={(p) => {
              const u = new URLSearchParams();
              if (tab !== "all") u.set("tab", tab);
              if (q) u.set("q", q);
              u.set("page", String(p));
              return `/dashboard/events?${u}`;
            }}
          />
        </>
      )}
    </div>
  );
}
