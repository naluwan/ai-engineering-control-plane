import type { ComponentPropsWithoutRef } from "react";

type BadgeVariant = "neutral" | "accent";

type BadgeProps = ComponentPropsWithoutRef<"span"> & {
  variant?: BadgeVariant;
};

const BASE_CLASS =
  "inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-xs";

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  neutral: "bg-foreground/10 text-foreground/70",
  accent: "border border-foreground/30 text-foreground/80",
};

export function Badge({ variant = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={[BASE_CLASS, VARIANT_CLASS[variant], className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
