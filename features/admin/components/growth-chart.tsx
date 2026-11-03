import { formatNumber } from "@/lib/format";

const day = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

const weekLabel = (iso: string) => day.format(new Date(`${iso}T00:00:00Z`));

/**
 * Leitores novos por semana, nas últimas 12: uma série só, em barras finas
 * apoiadas na base, sem legenda (o título diz o que é). O número de cada
 * semana aparece no hover e no foco, e a tabela escondida dá o mesmo aos
 * leitores de tela.
 */
export function GrowthChart({
  weeks,
}: {
  weeks: { week: string; users: number }[];
}) {
  const max = Math.max(1, ...weeks.map((week) => week.users));
  const first = weeks[0];
  const last = weeks.at(-1);

  return (
    <figure className="flex flex-col gap-4 rounded-card border border-border p-5">
      <figcaption className="flex flex-col gap-1">
        <span className="text-sm font-medium">Leitores novos por semana</span>
        <span className="font-mono text-xs text-muted-foreground">
          últimas 12 semanas
        </span>
      </figcaption>
      <div
        aria-hidden
        className="flex h-40 items-end gap-0.5 border-b border-border"
      >
        {weeks.map((week) => (
          <div
            key={week.week}
            className="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
          >
            <span className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full rounded-control border border-border bg-surface px-2 py-1 font-mono text-[11px] whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100">
              {formatNumber(week.users)} · {weekLabel(week.week)}
            </span>
            <div
              className="rounded-t-[4px] bg-foreground/80 transition-colors group-hover:bg-foreground"
              style={{
                height: `${(week.users / max) * 100}%`,
                minHeight: week.users > 0 ? 2 : 0,
              }}
            />
          </div>
        ))}
      </div>
      {first && last ? (
        <div
          aria-hidden
          className="flex justify-between font-mono text-[11px] text-muted-foreground"
        >
          <span>{weekLabel(first.week)}</span>
          <span>{weekLabel(last.week)}</span>
        </div>
      ) : null}
      <table className="sr-only">
        <caption>Leitores novos por semana</caption>
        <thead>
          <tr>
            <th scope="col">Semana de</th>
            <th scope="col">Leitores novos</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.week}>
              <td>{weekLabel(week.week)}</td>
              <td>{formatNumber(week.users)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
