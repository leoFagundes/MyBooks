import { cn } from "@/lib/utils";

type DevSectionProps = {
  id: string;
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
};

export function DevSection({
  id,
  number,
  title,
  description,
  children,
  className,
}: DevSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className="scroll-mt-24 border-b border-border py-14"
    >
      <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-6">
        <span className="font-mono text-xs text-muted-foreground">
          {number}
        </span>
        <div className="flex flex-col gap-1.5">
          <h2
            id={`${id}-titulo`}
            className="font-serif text-3xl tracking-tight"
          >
            {title}
          </h2>
          <p className="max-w-xl text-sm text-pretty text-muted-foreground">
            {description}
          </p>
        </div>
      </header>
      <div className={cn("flex flex-col gap-8", className)}>{children}</div>
    </section>
  );
}

export function DemoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
