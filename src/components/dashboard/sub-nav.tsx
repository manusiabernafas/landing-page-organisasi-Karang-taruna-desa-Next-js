"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export interface SubNavItem {
  href: string;
  label: string;
  /** Cocokkan pathname persis dan (opsional) query tertentu */
  match?: { path: string; query?: Record<string, string | null>; prefix?: boolean };
}

export function SubNav({ items, label }: { items: SubNavItem[]; label: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const isActive = (it: SubNavItem) => {
    const m = it.match ?? { path: it.href.split("?")[0] };
    const pathOk = m.prefix ? pathname === m.path || pathname.startsWith(m.path + "/") : pathname === m.path;
    if (!pathOk) return false;
    if (!m.query) return true;
    return Object.entries(m.query).every(([k, v]) => (v === null ? !params.get(k) : params.get(k) === v));
  };
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1 border-b border-border">
        {items.map((it) => {
          const active = isActive(it);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex h-11 items-center border-b-[3px] px-3 text-sm font-bold whitespace-nowrap transition-colors",
                  active ? "border-grass text-text" : "border-transparent text-muted hover:text-text",
                )}
              >
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
