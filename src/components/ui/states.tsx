import Link from "next/link";
import { buttonClass } from "./button";
import { cn } from "@/lib/utils/cn";
import { EmptyCamp } from "@/components/illustrations/empty-camp";

export function EmptyState({
  title,
  description,
  action,
  illustration = "camp",
  className,
  compact,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string } | React.ReactNode;
  illustration?: "camp" | "box" | "calendar" | "wallet" | "photo" | "bell" | "people";
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-dashed border-border-strong bg-surface-2 px-6 text-center",
        compact ? "py-8" : "py-12",
        className,
      )}
    >
      <EmptyCamp variant={illustration} className={compact ? "h-20" : "h-28"} />
      <h3 className="mt-4 font-display text-lg font-bold text-text">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? (
        <div className="mt-5">
          {typeof action === "object" && action !== null && "href" in action ? (
            <Link href={action.href} className={buttonClass("primary", "md")}>
              {action.label}
            </Link>
          ) : (
            action
          )}
        </div>
      ) : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  icon,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <div className="hidden shrink-0 sm:block">{icon}</div> : null}
        <div className="min-w-0">
          {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.14em] text-grass-600">{eyebrow}</p> : null}
          <h1 className="mt-1 font-display text-2xl font-extrabold leading-tight text-text sm:text-[28px]">{title}</h1>
          {description ? <p className="mt-1.5 max-w-2xl text-sm text-muted sm:text-[15px]">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
