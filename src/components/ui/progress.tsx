import { cn } from "@/lib/utils/cn";

const tones = {
  grass: "bg-grass",
  gold: "bg-gold",
  sky: "bg-sky",
  wood: "bg-wood",
  danger: "bg-danger",
} as const;

export function Progress({
  value,
  tone = "grass",
  size = "md",
  className,
  label,
  segmented,
}: {
  value: number;
  tone?: keyof typeof tones;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
  segmented?: boolean;
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const h = size === "sm" ? "h-1.5" : size === "lg" ? "h-4" : "h-2.5";
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      aria-label={label}
      className={cn("relative w-full overflow-hidden rounded-full bg-bg-soft ring-1 ring-inset ring-border", h, className)}
    >
      <div className={cn("anim-bar h-full rounded-full", tones[tone])} style={{ width: `${v}%` }}>
        {size === "lg" ? <div className="h-1/3 w-full rounded-full bg-white/30" /> : null}
      </div>
      {segmented ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "repeating-linear-gradient(90deg, transparent 0 calc(10% - 2px), var(--surface) calc(10% - 2px) 10%)",
          }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
