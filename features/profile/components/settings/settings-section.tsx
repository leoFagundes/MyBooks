/** Uma seção das configurações: título em serif, uma linha de contexto e o conteúdo. */
export function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-5 rounded-card border border-border p-5 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id={id} className="font-serif text-2xl tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-pretty text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
