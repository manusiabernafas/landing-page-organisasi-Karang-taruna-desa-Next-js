import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { getPublicEvents } from "@/lib/services/public";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/kegiatan`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/transparansi`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/dokumentasi`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];
  const events = await getPublicEvents("all", 200);
  const eventUrls: MetadataRoute.Sitemap = (events.data ?? []).map((e) => ({
    url: `${SITE_URL}/kegiatan/${e.slug}`,
    lastModified: new Date(e.updated_at),
    changeFrequency: "weekly",
    priority: 0.6,
  }));
  return [...base, ...eventUrls];
}
