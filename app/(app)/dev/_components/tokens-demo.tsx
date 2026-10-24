import { cn } from "@/lib/utils";

const swatches = [
  { name: "Fundo", token: "--background", className: "bg-background" },
  { name: "Superfície", token: "--surface", className: "bg-surface" },
  { name: "Borda", token: "--border", className: "bg-border" },
  {
    name: "Borda de campo",
    token: "--border-strong",
    className: "bg-border-strong",
  },
  { name: "Texto", token: "--foreground", className: "bg-foreground" },
  {
    name: "Secundário",
    token: "--muted-foreground",
    className: "bg-muted-foreground",
  },
  { name: "Acento", token: "--brand", className: "bg-brand" },
];

function Palette({ theme }: { theme: "light" | "dark" }) {
  return (
    <div
      data-theme={theme}
      className="rounded-card border border-border bg-background p-5 text-foreground"
    >
      <p className="mb-4 font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
        {theme === "light" ? "Claro" : "Escuro"}
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {swatches.map((swatch) => (
          <li key={swatch.token} className="flex flex-col gap-2">
            <span
              className={cn(
                "h-12 rounded-control border border-border",
                swatch.className,
              )}
            />
            <span className="text-xs">{swatch.name}</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {swatch.token}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TokensDemo() {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Palette theme="light" />
        <Palette theme="dark" />
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
            Instrument Serif · títulos
          </p>
          <p className="font-serif text-4xl leading-tight tracking-tight">
            Grande Sertão: Veredas
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
            Geist · interface
          </p>
          <p className="text-sm leading-relaxed">
            Riobaldo conta sua travessia pelo sertão, entre jagunços, amores e o
            pacto que talvez tenha feito.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
            Geist Mono · metadados
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            624 páginas · 1956 · ISBN 978-85-359-0277-5
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        {[
          { label: "Controles · 10px", className: "rounded-control" },
          { label: "Cards · 14px", className: "rounded-card" },
          { label: "Capas · 3px", className: "rounded-cover" },
        ].map((radius) => (
          <div key={radius.label} className="flex flex-col gap-2">
            <span
              className={cn(
                "block size-20 border border-border-strong bg-surface",
                radius.className,
              )}
            />
            <span className="font-mono text-[11px] text-muted-foreground">
              {radius.label}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
