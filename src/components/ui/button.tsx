import Link from "next/link";
import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

const variants = {
  primary:
    "bg-grass text-white shadow-[inset_0_-2px_0_rgb(0_0_0/0.14)] hover:bg-grass-600 dark:text-forest dark:hover:bg-grass-600",
  gold: "bg-gold text-forest shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)] hover:bg-gold-600 dark:hover:bg-gold-600",
  sky: "bg-sky text-white shadow-[inset_0_-2px_0_rgb(0_0_0/0.14)] hover:bg-sky-600 dark:text-forest",
  secondary: "border border-border-strong bg-surface text-text hover:bg-bg-soft",
  ghost: "text-text hover:bg-bg-soft",
  danger: "bg-danger text-white hover:opacity-90 dark:text-forest",
  "danger-soft": "bg-danger-bg text-danger hover:opacity-85",
} as const;

const sizes = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-11 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-base gap-2 rounded-xl",
  icon: "h-10 w-10 rounded-xl",
  "icon-sm": "h-9 w-9 rounded-lg",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-[background-color,transform,opacity] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-4 [&_svg]:shrink-0",
    variants[variant],
    sizes[size],
    className,
  );
}

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, loading, disabled, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : null}
      {children}
    </button>
  );
});

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
