import { cn } from "@/lib/utils";

/**
 * Texto longo (créditos, termos, privacidade): títulos em serifa, parágrafos
 * na largura de leitura e listas com marcador.
 */
export function Prose({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex max-w-prose flex-col gap-4 leading-relaxed text-pretty",
        "[&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-3xl [&_h2]:tracking-tight [&_h2]:text-balance",
        "[&_h3]:mt-4 [&_h3]:font-medium",
        "[&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5",
        "[&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-muted-foreground",
        "[&_strong]:font-medium",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Trecho que alguém precisa revisar antes de valer (os rascunhos dos termos e
 * da privacidade). No dev, fica marcado com a nota; em produção, é só texto.
 */
export function ToReview({
  note,
  children,
}: {
  note: string;
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV !== "development") return children;
  return (
    <mark
      title={`Revisar: ${note}`}
      data-revisar={note}
      className="rounded-[3px] bg-muted px-0.5 text-foreground outline outline-1 outline-brand outline-dashed"
    >
      {children}
    </mark>
  );
}
