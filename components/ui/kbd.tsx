import { cn } from "@/lib/utils";

/** Tecla de atalho, em mono, discreta. */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-border bg-surface px-1 font-mono text-[10px] leading-none text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
