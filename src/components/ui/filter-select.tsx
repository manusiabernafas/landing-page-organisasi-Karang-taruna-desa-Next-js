"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "./form";

/** Dropdown filter yang menyinkronkan query string (reset ke halaman 1). */
export function FilterSelect({
  param,
  label,
  options,
  className,
}: {
  param: string;
  label: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  return (
    <Select
      aria-label={label}
      className={className}
      value={params.get(param) ?? ""}
      disabled={pending}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        if (e.target.value) next.set(param, e.target.value);
        else next.delete(param);
        next.delete("page");
        const qs = next.toString();
        start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
