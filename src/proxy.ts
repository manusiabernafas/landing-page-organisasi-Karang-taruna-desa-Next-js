import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { REMEMBER_COOKIE, stripPersistence } from "@/lib/supabase/cookies";
import WebSocket from "ws";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { transport: WebSocket as never },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        const sessionOnly = request.cookies.get(REMEMBER_COOKIE)?.value === "0";
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, sessionOnly ? stripPersistence(options) : options));
      },
    },
  });

  // Refresh sesi; jangan jalankan logika lain di antara createServerClient dan getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  // Hanya navigasi GET yang dialihkan; POST (server action seperti login) harus diteruskan apa adanya.
  const isNavigation = request.method === "GET";
  const redirectTo = (target: URL) => {
    const res = NextResponse.redirect(target);
    // Bawa cookie sesi yang baru di-refresh, kalau tidak refresh token hilang dan sesi putus.
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };
  if (isNavigation && !user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return redirectTo(url);
  }
  if (isNavigation && user && pathname === "/login" && !request.nextUrl.searchParams.has("error")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return redirectTo(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|opengraph-image|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
