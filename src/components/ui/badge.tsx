import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";
import type { Tone } from "@/lib/utils/labels";

const tones: Record<Tone, string> = {
  green: "bg-grass-100 text-grass-600 ring-grass/20",
  sky: "bg-sky-100 text-sky-600 ring-sky/20",
  gold: "bg-gold-100 text-gold-600 ring-gold/25 dark:text-gold",
  wood: "bg-wood-100 text-wood-600 ring-wood/20",
  red: "bg-danger-bg text-danger ring-danger/20",
  gray: "bg-bg-soft text-muted ring-border-strong/60",
};

export function Badge({ tone = "gray", className, dot, ...props }: ComponentProps<"span"> & { tone?: Tone; dot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {props.children}
    </span>
  );
}
