import { GENRE_SLUGS, type GenreSlug } from "@/features/profile/genres";
import { BOOK_LIMITS, plain } from "./search-result";

const LITERATURE =
  /\b(fiction|literature|novels?|poetry|short stories|literatura|ficcao|romances?|contos|poesia)\b/;
const FICTION = /\b(fiction|ficcao)\b/;

// Cada regra lê um assunto sem acento e em minúsculas. Na dúvida, nenhum
// gênero: um gênero errado aparece no filtro da estante de todo mundo
const RULES: readonly (readonly [GenreSlug, (subject: string) => boolean])[] = [
  [
    "literatura-brasileira",
    // "Brazil" sozinho também marca livros de história sobre o Brasil
    (s) =>
      /\b(brazil|brazilian|brasil|brasileir[ao]s?)\b/.test(s) &&
      LITERATURE.test(s),
  ],
  ["classicos", (s) => /\b(classics?|classicos?)\b/.test(s)],
  [
    "romance",
    (s) => /\b(love stories|romance fiction|romantic fiction)\b/.test(s),
  ],
  ["contos", (s) => /\b(short stories|contos)\b/.test(s)],
  ["poesia", (s) => /\b(poetry|poems|poesia|poemas)\b/.test(s)],
  ["fantasia", (s) => /\b(fantasy|fantasia)\b/.test(s)],
  [
    "ficcao-cientifica",
    (s) => /\b(science fiction|ficcao cientifica)\b/.test(s),
  ],
  [
    "distopia",
    (s) => /\b(dystopias?|dystopian|distopias?|distopicos?)\b/.test(s),
  ],
  ["terror", (s) => /\b(horror|terror)\b/.test(s)],
  [
    "misterio",
    (s) =>
      /\b(mystery|mysteries|detective|thrillers?|suspense|misterio|policial)\b/.test(
        s,
      ),
  ],
  [
    "realismo-magico",
    (s) => /\b(magic(al)? realism|realismo magico)\b/.test(s),
  ],
  [
    "historia",
    // "History and criticism" é crítica literária, não livro de história
    (s) =>
      (/\bhistory\b/.test(s) && !/\b(criticism|fiction)\b/.test(s)) ||
      /\bhistoria\b/.test(s),
  ],
  [
    "biografia",
    (s) =>
      /\b(biography|biographies|autobiography|memoirs?|diaries|biografias?|memorias|diarios?)\b/.test(
        s,
      ),
  ],
  ["ciencia", (s) => /\b(science|ciencias?)\b/.test(s) && !FICTION.test(s)],
  ["filosofia", (s) => /\b(philosophy|philosophical|filosofia)\b/.test(s)],
  [
    "quadrinhos",
    (s) => /\b(comics?|graphic novels?|quadrinhos|manga)\b/.test(s),
  ],
  [
    "infantojuvenil",
    (s) =>
      /\b(juvenile|childrens?|children s|young adult|infantil|infantojuvenil|juvenil)\b/.test(
        s,
      ),
  ],
];

/**
 * Os assuntos da Open Library ou as categorias do Google viram gêneros do
 * MyBooks, na ordem de GENRES. "Ficção" só entra quando o assunto não disse
 * nada mais específico ("Science fiction" é só ficção científica).
 */
export function toGenreSlugs(subjects: readonly string[]): GenreSlug[] {
  const found = new Set<GenreSlug>();
  for (const subject of subjects) {
    const text = plain(subject);
    const matched = RULES.filter(([, matches]) => matches(text));
    for (const [slug] of matched) found.add(slug);
    if (matched.length === 0 && FICTION.test(text)) found.add("ficcao");
  }
  return GENRE_SLUGS.filter((slug) => found.has(slug)).slice(
    0,
    BOOK_LIMITS.genres,
  );
}
