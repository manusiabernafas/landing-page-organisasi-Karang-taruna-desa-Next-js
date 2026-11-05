import { Camera, Handshake, ListChecks, Lock, PartyPopper, ShieldCheck, Trophy, Users, UsersRound, Wallet, Warehouse, type LucideIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";
import { fmtDate, num } from "@/lib/utils/format";

const ICONS: Record<string, LucideIcon> = {
  warehouse: Warehouse,
  "shield-check": ShieldCheck,
  wallet: Wallet,
  "party-popper": PartyPopper,
  users: Users,
  "users-round": UsersRound,
  camera: Camera,
  "list-checks": ListChecks,
  handshake: Handshake,
  trophy: Trophy,
};

const tiers: Record<string, { ring: string; tile: string; label: string }> = {
  bronze: { ring: "ring-wood/30", tile: "bg-wood text-white dark:text-forest", label: "Perunggu" },
  silver: { ring: "ring-sky/30", tile: "bg-sky text-white dark:text-forest", label: "Perak" },
  gold: { ring: "ring-gold/40", tile: "bg-gold text-forest", label: "Emas" },
};

export function AchievementBadge({
  name,
  description,
  icon,
  tier,
  progress,
  threshold,
  unlockedAt,
  compact,
}: {
  name: string;
  description: string;
  icon: string;
  tier: string;
  progress: number;
  threshold: number;
  unlockedAt: string | null;
  compact?: boolean;
}) {
  const Icon = ICONS[icon] ?? Trophy;
  const t = tiers[tier] ?? tiers.bronze;
  const unlocked = Boolean(unlockedAt);
  const value = Math.min(100, Math.round((progress / threshold) * 100));
  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-card border bg-surface p-4 transition-shadow",
        unlocked ? cn("border-border shadow-soft-sm ring-2", t.ring) : "border-dashed border-border-strong",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "relative inline-flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-[inset_0_-3px_0_rgb(0_0_0/0.16),inset_0_1px_0_rgb(255_255_255/0.25)]",
            unlocked ? t.tile : "bg-bg-soft text-subtle",
          )}
          aria-hidden
        >
          <Icon className="size-6" />
          {!unlocked ? (
            <span className="absolute -right-1 -bottom-1 inline-flex size-5 items-center justify-center rounded-full bg-surface ring-1 ring-border">
              <Lock className="size-3" />
            </span>
          ) : null}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.14em] text-muted uppercase">{unlocked ? `Terbuka · ${t.label}` : "Terkunci"}</p>
          <h3 className="font-display text-[15px] leading-tight font-extrabold tracking-wide text-text uppercase">{name}</h3>
          {!compact ? <p className="mt-1 text-sm leading-snug text-muted">{description}</p> : null}
        </div>
      </div>
      <div className="mt-auto pt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
          <span className="text-muted tabular">
            {num(Math.min(progress, threshold))}/{num(threshold)}
          </span>
          <span className={unlocked ? "text-grass-600" : "text-muted"}>{unlocked && unlockedAt ? `Sejak ${fmtDate(unlockedAt, "MMM yyyy")}` : `${value}%`}</span>
        </div>
        <Progress value={value} tone={unlocked ? "gold" : "sky"} size="sm" label={`Progress ${name}`} />
      </div>
    </article>
  );
}
