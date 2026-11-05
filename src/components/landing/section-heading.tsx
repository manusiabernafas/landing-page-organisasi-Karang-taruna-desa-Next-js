import { cn } from "@/lib/utils/cn";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  action,
  className,
  id,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  action?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", align === "center" && "items-center text-center sm:flex-col sm:items-center", className)}>
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        <p className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-grass-600 uppercase">
          <span className="h-1.5 w-5 rounded-full bg-gold" aria-hidden />
          {eyebrow}
        </p>
        <h2 id={id} className="mt-2.5 font-display text-[28px] leading-[1.1] font-extrabold tracking-tight text-text sm:text-4xl">
          {title}
        </h2>
        {description ? <p className="mt-3 text-[15px] leading-relaxed text-muted sm:text-base">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
