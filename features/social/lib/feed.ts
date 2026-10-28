import type {
  ActivityRow,
  ActivityType,
  FeedCursor,
  FeedGroup,
  FeedPage,
} from "../types";

/** Atividades por página: o agrupamento junta várias num card só. */
export const FEED_PAGE_SIZE = 60;

// Mesma pessoa e mesmo tipo dentro de 24h da mais nova viram um card
const GROUP_WINDOW_MS = 24 * 60 * 60 * 1000;

const COLLECTION_TYPES = new Set<ActivityType>([
  "collection_create",
  "collection_add",
]);

function sameGroup(head: ActivityRow, row: ActivityRow) {
  return (
    head.actor.id === row.actor.id &&
    head.type === row.type &&
    (!COLLECTION_TYPES.has(row.type) ||
      head.collection?.id === row.collection?.id) &&
    Date.parse(head.at) - Date.parse(row.at) <= GROUP_WINDOW_MS
  );
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function toGroup(run: ActivityRow[]): FeedGroup {
  const head = run[0] as ActivityRow;
  return {
    key: head.id,
    type: head.type,
    actor: head.actor,
    at: head.at,
    books: uniqueById(run.flatMap((row) => (row.book ? [row.book] : []))),
    collection: head.collection,
    people: uniqueById(run.flatMap((row) => (row.target ? [row.target] : []))),
  };
}

/**
 * Agrupa as atividades seguidas (já da mais nova à mais antiga): "Ana
 * adicionou 3 livros a Quero ler". Só junta as vizinhas, então cada grupo é
 * um trecho contínuo e a paginação nunca repete atividade. Numa página
 * cheia, o último grupo pode continuar na próxima: ele fica para lá, a não
 * ser que seja o único. `last` é a última linha que o banco devolveu (a que
 * não virou atividade conta para o cursor).
 */
export function groupActivities(
  rows: ActivityRow[],
  { full, last }: { full: boolean; last: FeedCursor | null },
): FeedPage {
  const runs: ActivityRow[][] = [];
  for (const row of rows) {
    const run = runs.at(-1);
    if (run?.[0] && sameGroup(run[0], row)) run.push(row);
    else runs.push([row]);
  }
  if (!full) return { groups: runs.map(toGroup), next: null };
  if (runs.length > 1) {
    runs.pop();
    const end = runs.at(-1)?.at(-1) as ActivityRow;
    return { groups: runs.map(toGroup), next: { at: end.at, id: end.id } };
  }
  return { groups: runs.map(toGroup), next: last };
}
