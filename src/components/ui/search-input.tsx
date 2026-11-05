"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Pencarian dengan debounce 350ms yang menyinkronkan ?q= di URL (reset ke halaman 1). */
export function SearchInput({ placeholder = "Cari…", className, param = "q" }: { placeholder?: string; className?: string; param?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get(param) ?? "");
  const [pending, start] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value.trim()) next.set(param, value.trim());
      else next.delete(param);
      next.delete("page");
      const qs = next.toString();
      start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-xl border border-border-strong bg-surface pr-10 pl-10 text-[15px] placeholder:text-subtle focus:border-grass focus:ring-3 focus:ring-grass/20 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {pending ? (
        <span className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-grass border-t-transparent" aria-hidden />
      ) : value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-subtle hover:bg-bg-soft"
          aria-label="Hapus pencarian"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
