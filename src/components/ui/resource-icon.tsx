import { cn } from "@/lib/utils/cn";

const tones = {
  grass: "bg-grass text-white dark:text-forest",
  sky: "bg-sky text-white dark:text-forest",
  gold: "bg-gold text-forest",
  wood: "bg-wood text-white dark:text-forest",
  forest: "bg-forest text-gold dark:bg-grass-100 dark:text-gold",
  soft: "bg-bg-soft text-text",
} as const;

/** Tile ikon ala "resource" basecamp — rounded square dengan bevel bawah. */
export function ResourceIcon({
  children,
  tone = "grass",
  size = "md",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center shadow-[inset_0_-3px_0_rgb(0_0_0/0.16),inset_0_1px_0_rgb(255_255_255/0.25)]",
        size === "sm" && "size-8 rounded-lg [&_svg]:size-4",
        size === "md" && "size-11 rounded-xl [&_svg]:size-5",
        size === "lg" && "size-14 rounded-2xl [&_svg]:size-7",
        tones[tone],
        className,
      )}
      aria-hidden
    >
      {children}
    </span>
  );
}
