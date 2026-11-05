"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlarmClock, Bell, CalendarClock, HandHelping, ReceiptText, Wallet, type LucideIcon } from "lucide-react";
import { markNotificationAction } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils/cn";
import type { NotificationRow } from "@/types/db";

const ICON: Record<string, { icon: LucideIcon; tone: string }> = {
  BORROWING_REQUEST: { icon: HandHelping, tone: "bg-sky-100 text-sky-600" },
  BORROWING_DUE: { icon: AlarmClock, tone: "bg-gold-100 text-gold-600" },
  BORROWING_OVERDUE: { icon: AlarmClock, tone: "bg-danger-bg text-danger" },
  EVENT_SOON: { icon: CalendarClock, tone: "bg-grass-100 text-grass-600" },
  BUDGET_ALERT: { icon: Wallet, tone: "bg-danger-bg text-danger" },
  FINANCE_PENDING: { icon: ReceiptText, tone: "bg-gold-100 text-gold-600" },
};

function ago(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

export function NotificationList({ items }: { items: NotificationRow[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
      {items.map((n) => {
        const meta = ICON[n.type] ?? { icon: Bell, tone: "bg-bg-soft text-muted" };
        const Icon = meta.icon;
        const content = (
          <div className="flex gap-3">
            <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-xl", meta.tone)} aria-hidden>
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("text-[15px] leading-snug", n.is_read ? "text-muted" : "font-semibold text-text")}>{n.title}</p>
              {n.body ? <p className="mt-0.5 text-sm text-muted">{n.body}</p> : null}
              <p className="mt-1 text-xs text-subtle" suppressHydrationWarning>
                {ago(n.created_at)}
              </p>
            </div>
            {!n.is_read ? <span className="mt-2 size-2.5 shrink-0 rounded-full bg-danger" aria-label="Belum dibaca" /> : null}
          </div>
        );
        const markRead = () => {
          if (!n.is_read)
            start(async () => {
              await markNotificationAction(n.id, true);
              router.refresh();
            });
        };
        return (
          <li key={n.id} className={cn(!n.is_read && "bg-gold-100/40")}>
            {n.link ? (
              <Link href={n.link} onClick={markRead} className="block px-4 py-3.5 hover:bg-surface-2 sm:px-5">
                {content}
              </Link>
            ) : (
              <button type="button" onClick={markRead} className="block w-full px-4 py-3.5 text-left hover:bg-surface-2 sm:px-5">
                {content}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
