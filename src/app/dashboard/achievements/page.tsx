import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeLevel } from "@/lib/utils/level";
import { num } from "@/lib/utils/format";
import { PageHeader } from "@/components/ui/states";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { Progress } from "@/components/ui/progress";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { AchievementBadge } from "@/components/dashboard/achievement-badge";
import type { Achievement, OrgMetrics } from "@/types/db";

export const metadata: Metadata = { title: "Achievement" };

export default async function AchievementsPage() {
  const session = await requireSession();
  const supabase = await createClient();
  await supabase.rpc("refresh_achievements", { p_org: session.organization.id });
  const [all, mine, metrics] = await Promise.all([
    supabase.from("achievements").select("*").order("sort_order"),
    supabase.from("organization_achievements").select("achievement_id,progress,unlocked_at").eq("organization_id", session.organization.id),
    supabase.rpc("org_metrics", { p_org: session.organization.id }),
  ]);
  const map = new Map(((mine.data ?? []) as { achievement_id: string; progress: number; unlocked_at: string | null }[]).map((r) => [r.achievement_id, r]));
  const list = ((all.data ?? []) as Achievement[]).map((a) => ({ ...a, progress: map.get(a.id)?.progress ?? 0, unlocked_at: map.get(a.id)?.unlocked_at ?? null }));
  const unlocked = list.filter((a) => a.unlocked_at).length;
  const lvl = computeLevel(metrics.data as OrgMetrics);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Achievement"
        title="Pencapaian organisasi"
        description="Achievement dan level adalah catatan perkembangan organisasi bersama — bukan untuk meranking atau menilai individu."
        icon={
          <ResourceIcon tone="gold" size="lg">
            <Trophy />
          </ResourceIcon>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="rounded-card bg-forest p-5 text-white sm:p-6">
          <p className="text-xs font-bold tracking-[0.14em] text-gold uppercase">{lvl.title}</p>
          <p className="mt-1 font-display text-4xl font-extrabold">LEVEL {lvl.level}</p>
          <p className="text-[#b9cbb8]">{lvl.message}</p>
          <div className="mt-4 rounded-full bg-white/10 p-1">
            <Progress value={lvl.progress} tone="gold" size="lg" segmented className="bg-transparent ring-0" label="Progress level" />
          </div>
          <p className="mt-2 text-sm text-[#b9cbb8] tabular">
            {num(lvl.xp)} XP · {unlocked}/{list.length} achievement terbuka
          </p>
        </div>
        <Card>
          <CardHeader title="Dari mana XP basecamp?" description="Setiap aktivitas yang tercatat menambah perkembangan basecamp." />
          <CardBody>
            <ul className="grid gap-2 sm:grid-cols-2">
              {lvl.breakdown.map((b) => (
                <li key={b.key} className="flex items-center justify-between gap-3 rounded-xl bg-bg-soft px-3 py-2 text-sm">
                  <span>
                    <span className="font-bold tabular">{num(b.value)}</span> {b.label.toLowerCase()}
                  </span>
                  <span className="font-semibold text-grass-600 tabular">+{num(b.xp)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((a) => (
          <li key={a.id}>
            <AchievementBadge name={a.name} description={a.description} icon={a.icon} tier={a.tier} progress={a.progress} threshold={a.threshold} unlockedAt={a.unlocked_at} />
          </li>
        ))}
      </ul>
    </div>
  );
}
