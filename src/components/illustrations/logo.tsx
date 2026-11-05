import { cn } from "@/lib/utils/cn";

/** Logo mark BASECAMP PEMUDA RW 05: tenda + bendera di tile hijau hutan. */
export function LogoMark({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={cn("shrink-0", className)} aria-hidden>
      <rect width="48" height="48" rx="13" fill="#16301f" />
      <path d="M0 36 H48 V35 Q48 48 35 48 H13 Q0 48 0 35 Z" fill="#3e9b4f" />
      <path d="M9 37 L24 16 L39 37 Z" fill="#f2b632" />
      <path d="M24 16 L39 37 L31 37 Z" fill="#c98d0f" />
      <path d="M20 37 L24 27 L28 37 Z" fill="#16301f" />
      <rect x="23" y="8" width="2" height="9" fill="#fbf7ee" />
      <path d="M25 8.5 L32 10.8 L25 13 Z" fill="#e0493c" />
    </svg>
  );
}

export function Wordmark({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={compact ? 34 : 40} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[15px] font-extrabold tracking-tight text-text">
          BASECAMP <span className="text-grass-600">PEMUDA RW 05</span>
        </span>
        {!compact ? <span className="mt-1 text-[11px] font-medium text-muted">Kwarasan • Nogotirto • Gamping • Sleman</span> : null}
      </span>
    </span>
  );
}
