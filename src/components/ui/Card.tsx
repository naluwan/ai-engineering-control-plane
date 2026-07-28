import type { ComponentPropsWithoutRef } from "react";

type CardProps = ComponentPropsWithoutRef<"div">;

const BASE_CLASS = "rounded-lg border border-foreground/15 p-6";

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={[BASE_CLASS, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
