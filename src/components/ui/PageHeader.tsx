type PageHeaderProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  className?: string;
};

const BASE_CLASS = "flex flex-col gap-3";

export function PageHeader({
  title,
  eyebrow,
  description,
  className,
}: PageHeaderProps) {
  return (
    <div className={[BASE_CLASS, className].filter(Boolean).join(" ")}>
      {eyebrow ? (
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/60">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h1>
      {description ? (
        <p className="max-w-2xl text-sm leading-relaxed text-foreground/70">
          {description}
        </p>
      ) : null}
    </div>
  );
}
