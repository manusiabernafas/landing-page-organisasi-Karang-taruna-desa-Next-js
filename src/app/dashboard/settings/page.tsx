import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, History, Settings } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/states";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { OrganizationForm, PasswordForm, ProfileForm, UserManager, type UserRow } from "@/components/settings/settings-forms";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  const session = await requireSession();
  const isAdmin = can(session.profile.role, "settings.manage");
  const org = session.organization;
  let users: UserRow[] = [];
  let members: { id: string; name: string }[] = [];
  if (isAdmin) {
    const supabase = await createClient();
    const [profiles, mem] = await Promise.all([
      supabase.from("profiles").select("id,full_name,role,member_id").eq("organization_id", org.id).order("role").order("full_name"),
      supabase.from("members").select("id,name").eq("organization_id", org.id).eq("status", "ACTIVE").order("name"),
    ]);
    const emails = new Map<string, string>();
    if (hasServiceRole()) {
      // Email hanya dibaca di server untuk Super Admin; tidak pernah dikirim ke peran lain.
      const { data } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
      for (const u of data?.users ?? []) if (u.email) emails.set(u.id, u.email);
    }
    users = ((profiles.data ?? []) as Omit<UserRow, "email">[]).map((p) => ({ ...p, email: emails.get(p.id) ?? null }));
    members = (mem.data ?? []) as { id: string; name: string }[];
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Pengaturan"
        title="Pengaturan basecamp"
        description={`Masuk sebagai ${session.profile.full_name} · ${ROLE_LABEL[session.profile.role]}`}
        icon={
          <ResourceIcon tone="forest" size="lg">
            <Settings />
          </ResourceIcon>
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profil saya" />
          <CardBody>
            <ProfileForm fullName={session.profile.full_name} email={session.email} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Keamanan & tampilan" />
          <CardBody className="space-y-5">
            <PasswordForm />
            <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-2 px-4 py-3">
              <div>
                <p className="font-semibold">Mode gelap</p>
                <p className="text-xs text-muted">Tersimpan di perangkat ini.</p>
              </div>
              <ThemeToggle />
            </div>
          </CardBody>
        </Card>
      </div>

      {can(session.profile.role, "audit.view") ? (
        <Link href="/dashboard/settings/audit" className="flex items-center gap-4 rounded-card border border-border bg-surface p-4 hover:shadow-soft">
          <ResourceIcon tone="sky">
            <History />
          </ResourceIcon>
          <div className="flex-1">
            <p className="font-bold">Audit log</p>
            <p className="text-sm text-muted">Riwayat perubahan penting: transaksi, status unit, peminjaman, peran pengguna. Tidak bisa dihapus.</p>
          </div>
          <ArrowRight className="size-5 text-subtle" aria-hidden />
        </Link>
      ) : null}

      {isAdmin ? (
        <>
          <Card>
            <CardHeader title="Organisasi" description="Tampil di landing page, laporan, dan metadata." />
            <CardBody>
              <OrganizationForm
                org={{
                  name: org.name,
                  tagline: org.tagline,
                  about: org.about,
                  location: org.location,
                  strict_balance: org.settings.strict_balance ?? true,
                  public_inventory_summary: org.settings.public_inventory_summary ?? true,
                }}
              />
            </CardBody>
          </Card>
          <section aria-labelledby="users-title" className="space-y-3">
            <div>
              <h2 id="users-title" className="font-display text-lg font-bold">
                Pengguna & peran
              </h2>
              <p className="text-sm text-muted">Peran menentukan akses. Setiap perubahan peran tercatat di audit log.</p>
            </div>
            <UserManager users={users} members={members} currentUserId={session.userId} canCreate={hasServiceRole()} />
          </section>
        </>
      ) : null}
    </div>
  );
}
