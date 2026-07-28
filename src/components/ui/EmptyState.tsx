import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
};

const BASE_CLASS =
  "flex flex-col items-start gap-3 rounded-lg border border-dashed border-foreground/20 p-8";

export function EmptyState({
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <section className={[BASE_CLASS, className].filter(Boolean).join(" ")}>
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="max-w-2xl text-sm leading-relaxed text-foreground/70">
        {description}
      </p>
      {children ? <div className="pt-1">{children}</div> : null}
    </section>
  );
}
