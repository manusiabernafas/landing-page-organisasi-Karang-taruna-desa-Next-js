import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/shell";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { default: "Basecamp", template: "%s · Basecamp RW 05" },
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const session = await requireSession();
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.userId)
    .eq("is_read", false);
  return (
    <DashboardShell
      user={{ name: session.profile.full_name, role: session.profile.role, email: session.email, avatar: null }}
      unread={count ?? 0}
    >
      {children}
    </DashboardShell>
  );
}
