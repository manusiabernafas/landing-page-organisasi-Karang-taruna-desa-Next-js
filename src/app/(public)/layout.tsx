import { PublicNavbar } from "@/components/landing/public-navbar";
import { PublicFooter } from "@/components/landing/public-footer";
import { isSupabaseConfigured } from "@/lib/config";
import { getAuthUser } from "@/lib/auth";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  let loggedIn = false;
  if (isSupabaseConfigured()) {
    try {
      loggedIn = Boolean(await getAuthUser());
    } catch {
      loggedIn = false;
    }
  }
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicNavbar loggedIn={loggedIn} />
      <main id="konten" className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
