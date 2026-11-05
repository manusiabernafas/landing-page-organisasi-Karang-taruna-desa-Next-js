import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/format";

const palette = ["bg-grass-100 text-grass-600", "bg-sky-100 text-sky-600", "bg-gold-100 text-gold-600", "bg-wood-100 text-wood-600"];

export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const idx = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold ring-2 ring-surface", palette[idx], className)}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}
