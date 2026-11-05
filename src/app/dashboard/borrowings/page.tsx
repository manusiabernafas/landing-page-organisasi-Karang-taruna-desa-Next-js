import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, HandHelping, Package } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { countBorrowingsByStatus, listBorrowings } from "@/lib/services/borrowings";
import { BORROWING_STATUS } from "@/lib/utils/labels";
import { countdownLabel, daysUntil, fmtDate } from "@/lib/utils/format";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { LinkTabs } from "@/components/ui/tabs";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Peminjaman" };
const PER_PAGE = 12;

export default async function BorrowingsPage({ searchParams }: PageProps<"/dashboard/borrowings">) {
  const session = await requireSession();
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const [res, counts] = await Promise.all([listBorrowings(session.organization.id, { status, q, page, pageSize: PER_PAGE }), countBorrowingsByStatus(session.organization.id)]);
  const href = (s?: string) => {
    const u = new URLSearchParams();
    if (s) u.set("status", s);
    if (q) u.set("q", q);
    return `/dashboard/borrowings${u.size ? `?${u}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput placeholder="Cari peminjam, kode, atau keperluan…" className="sm:max-w-md sm:flex-1" />
        <ButtonLink href="/dashboard/borrowings/new" className="sm:ml-auto">
          <HandHelping /> Ajukan Peminjaman
        </ButtonLink>
      </div>
      <LinkTabs
        label="Status peminjaman"
        active={status ?? "all"}
        tabs={[
          { key: "all", label: "Semua", href: href() },
          { key: "REQUESTED", label: "Menunggu", href: href("REQUESTED"), count: counts.REQUESTED ?? 0 },
          { key: "APPROVED", label: "Siap diserahkan", href: href("APPROVED"), count: counts.APPROVED ?? 0 },
          { key: "BORROWED", label: "Dipinjam / Pengembalian", href: href("BORROWED"), count: counts.BORROWED ?? 0 },
          { key: "DONE", label: "Selesai", href: href("DONE") },
        ]}
      />
      {res.items.length === 0 ? (
        <EmptyState
          illustration="box"
          title={q ? "Peminjaman tidak ditemukan." : "Belum ada peminjaman di sini."}
          description={q ? "Coba kata kunci lain." : "Tenda, kursi, dan sound siap dipinjam warga. Ajukan lewat tombol di atas."}
          action={!q ? { label: "Ajukan Peminjaman", href: "/dashboard/borrowings/new" } : undefined}
        />
      ) : (
        <>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {res.items.map((b) => {
              const st = BORROWING_STATUS[b.status];
              const d = daysUntil(b.expected_return_date);
              const late = b.status === "BORROWED" && d < 0;
              return (
                <li key={b.id}>
                  <Link href={`/dashboard/borrowings/${b.id}`} className="flex h-full flex-col rounded-card border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:shadow-soft">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-mono text-xs text-muted">{b.borrowing_code}</p>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                    <p className="mt-1 font-display text-lg font-bold">{b.borrower_name}</p>
                    <p className="line-clamp-2 text-sm text-muted">{b.purpose}</p>
                    {b.event ? <p className="mt-1 text-xs font-semibold text-grass-600">Event: {b.event.name}</p> : null}
                    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Package className="size-3.5" aria-hidden /> {b.items.length} unit
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="size-3.5" aria-hidden /> {fmtDate(b.borrow_date, "d MMM")} – {fmtDate(b.expected_return_date, "d MMM")}
                      </span>
                      {b.status === "BORROWED" ? (
                        <Badge tone={late ? "red" : d <= 1 ? "gold" : "gray"}>{late ? `Telat ${Math.abs(d)} hari` : `Kembali ${countdownLabel(b.expected_return_date).toLowerCase()}`}</Badge>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Pagination
            page={page}
            pageSize={PER_PAGE}
            total={res.total}
            makeHref={(p) => {
              const u = new URLSearchParams();
              if (status) u.set("status", status);
              if (q) u.set("q", q);
              u.set("page", String(p));
              return `/dashboard/borrowings?${u}`;
            }}
          />
        </>
      )}
    </div>
  );
}
