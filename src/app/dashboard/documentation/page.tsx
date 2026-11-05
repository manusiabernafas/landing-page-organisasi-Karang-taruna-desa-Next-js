import type { Metadata } from "next";
import { Camera } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/services/storage";
import { fmtDate } from "@/lib/utils/format";
import { EmptyState, PageHeader } from "@/components/ui/states";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { FilterSelect } from "@/components/ui/filter-select";
import { LinkTabs } from "@/components/ui/tabs";
import { Pagination } from "@/components/ui/pagination";
import { DocUploader } from "@/components/documentation/doc-uploader";
import { DocGalleryAdmin } from "@/components/documentation/doc-gallery-admin";
import type { DocumentRow } from "@/types/db";

export const metadata: Metadata = { title: "Dokumentasi" };
const PER_PAGE = 24;

export default async function DocumentationPage({ searchParams }: PageProps<"/dashboard/documentation">) {
  const session = await requireSession();
  const sp = await searchParams;
  const eventId = typeof sp.event === "string" && /^[0-9a-f-]{36}$/.test(sp.event) ? sp.event : undefined;
  const vis = sp.vis === "PUBLIC" || sp.vis === "INTERNAL" ? sp.vis : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let q = supabase.from("documents").select("*, event:events(name)", { count: "exact" }).eq("organization_id", session.organization.id);
  if (eventId) q = q.eq("event_id", eventId);
  if (vis) q = q.eq("visibility", vis);
  const from = (page - 1) * PER_PAGE;
  const [docs, events] = await Promise.all([
    q.order("taken_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).range(from, from + PER_PAGE - 1),
    supabase.from("events").select("id,name").eq("organization_id", session.organization.id).order("start_date", { ascending: false }),
  ]);
  const rows = (docs.data ?? []) as (DocumentRow & { event: { name: string } | null })[];
  const urls = await signedUrls(supabase, "documentation", rows.map((r) => r.file_path));
  const role = session.profile.role;
  const manager = can(role, "members.manage");
  const evList = (events.data ?? []) as { id: string; name: string }[];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Dokumentasi"
        title="Album basecamp"
        description="Semua foto tersimpan aman di storage. Foto internal hanya terlihat anggota; foto publik tampil di galeri website."
        icon={
          <ResourceIcon tone="gold" size="lg">
            <Camera />
          </ResourceIcon>
        }
        actions={can(role, "documents.upload") ? <DocUploader events={evList} /> : null}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-72">
          <FilterSelect param="event" label="Filter event" options={[{ value: "", label: "Semua event" }, ...evList.map((e) => ({ value: e.id, label: e.name }))]} />
        </div>
        <LinkTabs
          label="Visibilitas"
          active={vis ?? "all"}
          tabs={[
            { key: "all", label: "Semua", href: `/dashboard/documentation${eventId ? `?event=${eventId}` : ""}` },
            { key: "PUBLIC", label: "Publik", href: `/dashboard/documentation?vis=PUBLIC${eventId ? `&event=${eventId}` : ""}` },
            { key: "INTERNAL", label: "Internal", href: `/dashboard/documentation?vis=INTERNAL${eventId ? `&event=${eventId}` : ""}` },
          ]}
        />
      </div>
      {rows.length === 0 ? (
        <EmptyState illustration="photo" title="Belum ada dokumentasi." description="Unggah foto kegiatan supaya ceritanya tidak hilang di grup WhatsApp." />
      ) : (
        <>
          <DocGalleryAdmin
            items={rows.map((d) => ({
              id: d.id,
              url: urls[d.file_path] ?? null,
              caption: d.caption,
              width: d.width,
              height: d.height,
              meta: [d.event?.name, d.taken_at ? fmtDate(d.taken_at) : null].filter(Boolean).join(" · "),
              visibility: d.visibility,
              canEdit: manager || d.uploaded_by === session.userId,
            }))}
          />
          <Pagination
            page={page}
            pageSize={PER_PAGE}
            total={docs.count ?? 0}
            makeHref={(p) => {
              const u = new URLSearchParams();
              if (eventId) u.set("event", eventId);
              if (vis) u.set("vis", vis);
              u.set("page", String(p));
              return `/dashboard/documentation?${u}`;
            }}
          />
        </>
      )}
    </div>
  );
}
