import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { listMembers } from "@/lib/services/members";
import { MEMBER_ROLE } from "@/lib/utils/labels";
import { fmtDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/states";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { SearchInput } from "@/components/ui/search-input";
import { FilterSelect } from "@/components/ui/filter-select";
import { LinkTabs } from "@/components/ui/tabs";
import { Pagination } from "@/components/ui/pagination";

export const metadata: Metadata = { title: "Anggota" };
const PER_PAGE = 24;

const roleTone: Record<string, string> = {
  KETUA: "bg-gold text-forest",
  WAKIL: "bg-gold-100 text-gold-600",
  SEKRETARIS: "bg-sky-100 text-sky-600",
  BENDAHARA: "bg-grass-100 text-grass-600",
  KOORDINATOR: "bg-wood-100 text-wood-600",
  ANGGOTA: "bg-bg-soft text-muted",
};

export default async function MembersPage({ searchParams }: PageProps<"/dashboard/members">) {
  const session = await requireSession();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const role = typeof sp.role === "string" ? sp.role : undefined;
  const status = sp.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";
  const page = Math.max(1, Number(sp.page) || 1);
  const res = await listMembers(session.organization.id, { q, role, status, page, pageSize: PER_PAGE });
  const canManage = can(session.profile.role, "members.manage");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Anggota"
        title="Squad Pemuda RW 05"
        description="Wajah-wajah di balik setiap kegiatan. Data kontak hanya terlihat oleh pengurus inti."
        icon={
          <ResourceIcon tone="sky" size="lg">
            <Users />
          </ResourceIcon>
        }
        actions={
          canManage ? (
            <ButtonLink href="/dashboard/members/new">
              <UserPlus /> Tambah Anggota
            </ButtonLink>
          ) : null
        }
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <SearchInput placeholder="Cari nama atau panggilan…" />
        <FilterSelect param="role" label="Filter jabatan" options={[{ value: "", label: "Semua jabatan" }, ...Object.entries(MEMBER_ROLE).map(([v, l]) => ({ value: v, label: l }))]} />
      </div>
      <LinkTabs
        label="Status anggota"
        active={status}
        tabs={[
          { key: "ACTIVE", label: "Aktif", href: "/dashboard/members" },
          { key: "INACTIVE", label: "Nonaktif", href: "/dashboard/members?status=INACTIVE" },
        ]}
      />
      {res.items.length === 0 ? (
        <EmptyState
          illustration="people"
          title={q ? "Anggota tidak ditemukan." : "Belum ada anggota di sini."}
          description={q ? "Coba kata kunci lain." : undefined}
          action={canManage && !q ? { label: "Tambah Anggota", href: "/dashboard/members/new" } : undefined}
        />
      ) : (
        <>
          <p className="text-sm text-muted">{res.total} anggota</p>
          <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {res.items.map((m) => (
              <li key={m.id}>
                <Link href={`/dashboard/members/${m.id}`} className="group flex items-center gap-3 rounded-card border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:shadow-soft">
                  <Avatar name={m.name} src={m.photoUrl} size={52} />
                  <div className="min-w-0">
                    <p className="truncate font-bold group-hover:text-grass-600">{m.name}</p>
                    <p className="truncate text-xs text-muted">
                      {m.nickname ? `"${m.nickname}" · ` : ""}sejak {fmtDate(m.join_date, "yyyy")}
                    </p>
                    <span className={cn("mt-1 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-bold", roleTone[m.role])}>{MEMBER_ROLE[m.role]}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            pageSize={PER_PAGE}
            total={res.total}
            makeHref={(p) => {
              const u = new URLSearchParams();
              if (q) u.set("q", q);
              if (role) u.set("role", role);
              if (status === "INACTIVE") u.set("status", status);
              u.set("page", String(p));
              return `/dashboard/members?${u}`;
            }}
          />
        </>
      )}
    </div>
  );
}
