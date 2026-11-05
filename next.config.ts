import type { NextConfig } from "next";

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host;
  } catch {
    return "";
  }
})();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Jangan cetak argumen server action (bisa berisi password) di log dev.
  logging: { serverFunctions: false },
  // Upload dokumentasi: maks 6 foto × 5 MB per aksi.
  experimental: {
    serverActions: { bodySizeLimit: "32mb" },
    proxyClientMaxBodySize: "32mb",
  },
  images: {
    remotePatterns: supabaseHost ? [{ protocol: supabaseHost.startsWith("localhost") || supabaseHost.startsWith("127.") ? "http" : "https", hostname: supabaseHost.split(":")[0] }] : [],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
