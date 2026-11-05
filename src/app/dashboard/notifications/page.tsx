import type { Metadata } from "next";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/ui/states";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { ActionButton } from "@/components/ui/action-button";
import { LinkTabs } from "@/components/ui/tabs";
import { NotificationList } from "@/components/dashboard/notification-list";
import { clearReadNotificationsAction, markAllReadAction } from "@/lib/actions/notifications";
import type { NotificationRow } from "@/types/db";

export const metadata: Metadata = { title: "Notifikasi" };

export default async function NotificationsPage({ searchParams }: PageProps<"/dashboard/notifications">) {
  const session = await requireSession();
  const sp = await searchParams;
  const unreadOnly = sp.view === "unread";
  const supabase = await createClient();
  await supabase.rpc("refresh_notifications");
  let q = supabase.from("notifications").select("id,type,title,body,link,is_read,created_at").eq("user_id", session.userId).order("created_at", { ascending: false }).limit(100);
  if (unreadOnly) q = q.eq("is_read", false);
  const { data } = await q;
  const items = (data ?? []) as NotificationRow[];
  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        eyebrow="Notifikasi"
        title="Kabar dari basecamp"
        description="Pengingat jatuh tempo pengembalian, event yang makin dekat, budget event, dan pengajuan yang butuh persetujuan."
        icon={
          <ResourceIcon tone="gold" size="lg">
            <Bell />
          </ResourceIcon>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LinkTabs
          label="Filter notifikasi"
          active={unreadOnly ? "unread" : "all"}
          tabs={[
            { key: "all", label: "Semua", href: "/dashboard/notifications" },
            { key: "unread", label: "Belum dibaca", href: "/dashboard/notifications?view=unread", count: unreadOnly ? unread : undefined },
          ]}
        />
        <div className="flex gap-2">
          {unread > 0 ? (
            <ActionButton action={markAllReadAction} variant="secondary" size="sm" icon={<CheckCheck />}>
              Tandai semua dibaca
            </ActionButton>
          ) : null}
          {items.some((n) => n.is_read) ? (
            <ActionButton action={clearReadNotificationsAction} variant="ghost" size="sm" icon={<Trash2 />}>
              Bersihkan yang dibaca
            </ActionButton>
          ) : null}
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyState illustration="bell" title={unreadOnly ? "Semua notifikasi sudah dibaca." : "Belum ada notifikasi."} description="Basecamp tenang. Kabar penting akan muncul di sini." />
      ) : (
        <NotificationList items={items} />
      )}
    </div>
  );
}
