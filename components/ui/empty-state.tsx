import { cn } from "@/lib/utils";

type EmptyStateProps = {
  illustration?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

/** Estado vazio: ilustração em traço fino + uma ação (spec §8). */
export function EmptyState({
  illustration: Illustration,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-card border border-dashed border-border px-6 py-10 text-center",
        className,
      )}
    >
      {Illustration ? (
        <Illustration className="mb-1 h-16 w-24 text-border-strong" />
      ) : null}
      <p className="font-serif text-xl tracking-tight text-balance">{title}</p>
      {description ? (
        <p className="max-w-xs text-sm text-pretty text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
