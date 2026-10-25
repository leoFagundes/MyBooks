// Espelho de private.reserved_usernames() (migration dos perfis):
// tests/db/usernames.test.ts confere que as duas listas são iguais
export const RESERVED_USERNAMES: readonly string[] = [
  "admin",
  "administrador",
  "ajuda",
  "api",
  "auth",
  "cadastro",
  "citacoes",
  "colecao",
  "colecoes",
  "configuracoes",
  "contato",
  "dev",
  "entrar",
  "equipe",
  "estante",
  "explorar",
  "inicio",
  "livro",
  "livros",
  "moderador",
  "mybooks",
  "notificacoes",
  "null",
  "oficial",
  "onboarding",
  "root",
  "sair",
  "sistema",
  "sobre",
  "suporte",
  "undefined",
  "usuario",
  "www",
];

/** Resposta do GET /api/usernames/availability. */
export type UsernameAvailability =
  "available" | "taken" | "invalid" | "reserved" | "yours";

const MAX_LENGTH = 20;

/**
 * Enquanto a pessoa digita: minúsculo e sem acento; espaço, ponto e hífen
 * viram _; o que não cabe num @ sai. O _ do fim fica (ela ainda está
 * digitando a próxima palavra).
 */
export function typedUsername(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trimStart()
    .replace(/^@+/, "")
    .replace(/[\s.-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_{2,}/g, "_")
    .slice(0, MAX_LENGTH);
}

/** O @ pronto, como o banco deriva no cadastro (" @Ana Lívia " → "ana_livia"). */
export function normalizeUsername(input: string): string {
  return typedUsername(input).replace(/^_+|_+$/g, "");
}
