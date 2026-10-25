import { Reveal } from "@/components/motion/reveal";
import { Skeleton } from "@/components/ui/skeleton";

type AuthCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

const cardClasses = "rounded-card border border-border bg-surface p-6 sm:p-8";

/** Cartão central de entrar e cadastrar (spec §5.2). */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <Reveal>
      <section className={cardClasses}>
        <h1 className="font-serif text-3xl leading-tight tracking-tight text-balance">
          {title}
        </h1>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          {description}
        </p>
        <div className="mt-6">{children}</div>
        {footer ? (
          <div className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </section>
    </Reveal>
  );
}

export function AuthDivider() {
  return (
    <div
      aria-hidden
      className="flex items-center gap-3 text-xs text-muted-foreground"
    >
      <span className="h-px flex-1 bg-border" />
      ou
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  ) : null;
}

export function AuthCardSkeleton() {
  return (
    <div className={cardClasses} aria-busy aria-label="Carregando">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-8 h-11 w-full" />
      <Skeleton className="mt-6 h-10 w-full" />
      <Skeleton className="mt-4 h-10 w-full" />
      <Skeleton className="mt-6 h-11 w-full" />
    </div>
  );
}
