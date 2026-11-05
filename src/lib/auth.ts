import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, type Permission } from "@/lib/permissions";
import type { Organization, Profile } from "@/types/db";

export interface Session {
  userId: string;
  email: string | null;
  profile: Profile;
  organization: Organization;
}

/** Sesi aktif (di-cache per request). null jika belum login / belum punya organisasi. */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  if (!profile?.organization_id) return null;
  const { data: organization } = await supabase
    .from("organizations")
    .select("id,name,slug,short_name,location,tagline,about,logo,settings")
    .eq("id", profile.organization_id)
    .maybeSingle<Organization>();
  if (!organization) return null;
  return { userId: user.id, email: user.email ?? null, profile, organization };
});

export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    const user = await getAuthUser();
    redirect(user ? "/login?error=no-org" : "/login");
  }
  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireSession();
  if (!can(session.profile.role, permission)) {
    redirect(`/dashboard?denied=${encodeURIComponent(permission)}`);
  }
  return session;
}
