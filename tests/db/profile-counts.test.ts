import { describe, test } from "vitest";
import {
  asAdmin,
  asAnon,
  asUser,
  check,
  createUser,
  runSql,
  sqlTransaction,
} from "./sql";

const LIA = "00000000-0000-4000-8000-000000000001";
const BENTO = "00000000-0000-4000-8000-000000000002";
const CAPITU = "00000000-0000-4000-8000-000000000003";
const SERTAO = "00000000-0000-4000-8000-000000000101";
const HOBBIT = "00000000-0000-4000-8000-000000000102";

const counts = (id: string, column: string) =>
  `(select ${column} from public.profile_counts('${id}'))`;

// Lia (pública) tem 2 livros, uma coleção pública e uma privada; Bento
// (privado) segue a Lia; Capitu pediu para seguir o Bento (pendente)
const scene = () => [
  createUser({ id: LIA, email: "lia@x.com" }),
  createUser({ id: BENTO, email: "bento@x.com" }),
  createUser({ id: CAPITU, email: "capitu@x.com" }),
  `update public.profiles set is_private = true where id = '${BENTO}';`,
  `insert into public.books (id, title, source) values
    ('${SERTAO}', 'Grande Sertão: Veredas', 'manual'),
    ('${HOBBIT}', 'O Hobbit', 'manual');`,
  `insert into public.user_books (user_id, book_id, status) values
    ('${LIA}', '${SERTAO}', 'read'),
    ('${LIA}', '${HOBBIT}', 'want'),
    ('${BENTO}', '${HOBBIT}', 'reading');`,
  `insert into public.collections (owner_id, title, visibility) values
    ('${LIA}', 'Para reler', 'public'),
    ('${LIA}', 'Segredos', 'private');`,
  `insert into public.follows (follower_id, following_id) values
    ('${BENTO}', '${LIA}'),
    ('${CAPITU}', '${BENTO}');`,
];

describe("contadores do perfil", () => {
  test("livros, coleções públicas, seguidores e seguindo, só os aceitos", async () => {
    await runSql(
      sqlTransaction(
        ...scene(),
        asAnon(),
        check(`${counts(LIA, "books")} = 2`, "2 livros da Lia"),
        check(`${counts(LIA, "collections")} = 1`, "só a coleção pública"),
        check(`${counts(LIA, "followers")} = 1`, "o Bento segue a Lia"),
        check(`${counts(LIA, "following")} = 0`, "a Lia não segue ninguém"),
        // O pedido da Capitu ainda não foi aceito
        check(`${counts(BENTO, "followers")} = 0`, "pedido pendente não conta"),
        check(`${counts(CAPITU, "following")} = 0`, "nem para quem pediu"),
      ),
    );
  });

  test("o dono conta também as coleções privadas", async () => {
    await runSql(
      sqlTransaction(
        ...scene(),
        asUser(LIA),
        check(`${counts(LIA, "collections")} = 2`, "a Lia vê as duas"),
        asUser(BENTO),
        check(`${counts(LIA, "collections")} = 1`, "o Bento vê uma"),
      ),
    );
  });

  test("perfil privado mostra os contadores a quem não segue", async () => {
    await runSql(
      sqlTransaction(
        ...scene(),
        asUser(CAPITU),
        // A estante do Bento fica escondida, mas o número aparece
        check(
          `(select count(*) from public.user_books where user_id = '${BENTO}') = 0`,
          "a Capitu não vê a estante do Bento",
        ),
        check(`${counts(BENTO, "books")} = 1`, "mas vê que ele tem 1 livro"),
        check(`${counts(BENTO, "following")} = 1`, "e que ele segue 1 pessoa"),
        asAdmin(),
        `update public.follows set status = 'accepted' where follower_id = '${CAPITU}';`,
        asAnon(),
        check(`${counts(BENTO, "followers")} = 1`, "aceito, o pedido conta"),
      ),
    );
  });
});
