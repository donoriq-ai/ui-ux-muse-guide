import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-md border border-border bg-card overflow-hidden",
        className,
      )}
    >
      {(title || description || action) && (
        <header className="flex items-start justify-between gap-4 px-4 py-3 border-b border-border bg-surface">
          <div className="min-w-0">
            {title && <h3 className="text-[13px] font-medium text-foreground">{title}</h3>}
            {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div>{children}</div>
    </section>
  );
}
