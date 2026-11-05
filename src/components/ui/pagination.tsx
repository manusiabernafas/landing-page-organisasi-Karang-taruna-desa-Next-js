import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Pagination({
  page,
  pageSize,
  total,
  makeHref,
}: {
  page: number;
  pageSize: number;
  total: number;
  makeHref: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn = "inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-xl border border-border bg-surface px-3 text-sm font-semibold";
  return (
    <nav aria-label="Navigasi halaman" className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted tabular">
        Menampilkan {from}–{to} dari {total}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={makeHref(page - 1)} className={cn(btn, "hover:bg-bg-soft")} rel="prev">
            <ChevronLeft className="size-4" /> Sebelumnya
          </Link>
        ) : (
          <span className={cn(btn, "opacity-45")} aria-disabled>
            <ChevronLeft className="size-4" /> Sebelumnya
          </span>
        )}
        <span className="px-1 text-sm font-semibold tabular">
          {page}/{pages}
        </span>
        {page < pages ? (
          <Link href={makeHref(page + 1)} className={cn(btn, "hover:bg-bg-soft")} rel="next">
            Berikutnya <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className={cn(btn, "opacity-45")} aria-disabled>
            Berikutnya <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
