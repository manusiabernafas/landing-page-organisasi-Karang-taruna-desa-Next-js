import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function LinkTabs({
  tabs,
  active,
  label,
  className,
}: {
  tabs: { key: string; label: string; href: string; count?: number; icon?: React.ReactNode }[];
  active: string;
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0", className)}>
      <ul className="flex w-max min-w-full gap-1 rounded-2xl border border-border bg-surface p-1 sm:w-auto">
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <li key={t.key}>
              <Link
                href={t.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold whitespace-nowrap transition-colors [&_svg]:size-4",
                  isActive ? "bg-forest text-white dark:bg-grass dark:text-forest" : "text-muted hover:bg-bg-soft hover:text-text",
                )}
              >
                {t.icon}
                {t.label}
                {typeof t.count === "number" ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[11px] tabular",
                      isActive ? "bg-white/20" : "bg-bg-soft text-muted",
                    )}
                  >
                    {t.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
