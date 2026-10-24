import { cn } from "@/lib/utils";

// Campos usam --border-strong (via --input) para ter 3:1 de contraste.
const fieldClasses =
  "w-full min-w-0 rounded-control border border-input bg-surface px-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(fieldClasses, "h-10", className)}
      {...props}
    />
  );
}

export { Input, fieldClasses };
