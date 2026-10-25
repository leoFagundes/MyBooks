import { describe, test } from "vitest";
import {
  asAdmin,
  asAnon,
  asUser,
  check,
  createUser,
  rejects,
  runSql,
  sqlTransaction,
} from "./sql";

const LIA = "00000000-0000-4000-8000-000000000001";
const BENTO = "00000000-0000-4000-8000-000000000002";
const CAPITU = "00000000-0000-4000-8000-000000000003";
const SERTAO = "00000000-0000-4000-8000-000000000101";
const HOBBIT = "00000000-0000-4000-8000-000000000102";

const readers = () => [
  createUser({ id: LIA, email: "lia@x.com" }),
  createUser({ id: BENTO, email: "bento@x.com" }),
  createUser({ id: CAPITU, email: "capitu@x.com" }),
];

const books = () =>
  `insert into public.books (id, title, authors, source, page_count, published_year) values
    ('${SERTAO}', 'Grande Sertão: Veredas', '{"João Guimarães Rosa"}', 'manual', 504, 1956),
    ('${HOBBIT}', 'O Hobbit', '{"J. R. R. Tolkien"}', 'manual', 336, 1937);`;

const count = (from: string) => `(select count(*) from ${from})`;

describe("catálogo", () => {
  test("visitante e logado leem o catálogo", async () => {
    await runSql(
      sqlTransaction(
        ...readers(),
        books(),
        asAnon(),
        check(
          `${count("public.books where id in ('" + SERTAO + "', '" + HOBBIT + "')")} = 2`,
          "visitante lê",
        ),
        asUser(LIA),
        check(
          `${count("public.books where id = '" + SERTAO + "'")} = 1`,
          "logado lê",
        ),
      ),
    );
  });

  test("só quem está logado põe livro no catálogo, e em nome próprio", async () => {
    const insert = (createdBy: string) =>
      `insert into public.books (title, authors, source, created_by) values ('Torto Arado', '{"Itamar Vieira Junior"}', 'manual', '${createdBy}');`;
    await runSql(
      sqlTransaction(
        ...readers(),
        asAnon(),
        rejects(insert(LIA), "visitante inserir"),
        asUser(LIA),
        rejects(insert(BENTO), "inserir em nome de outra pessoa"),
        insert(LIA),
        rejects(
          `update public.books set title = 'Outro' where created_by = '${LIA}';`,
          "editar o catálogo",
        ),
        rejects(
          `delete from public.books where created_by = '${LIA}';`,
          "apagar do catálogo",
        ),
        asAdmin(),
        check(
          `(select title from public.books where created_by = '${LIA}') = 'Torto Arado'`,
          "o livro entrou intacto",
        ),
      ),
    );
  });

  test("cada coluna do catálogo tem formato e limite", async () => {
    const bad = (columns: string, values: string, label: string) =>
      rejects(
        `insert into public.books (title, source, ${columns}) values ('Livro', 'manual', ${values});`,
        label,
      );
    await runSql(
      sqlTransaction(
        ...readers(),
        asUser(LIA),
        bad("created_by, cover_color", `'${LIA}', '#ABCDEF'`, "cor maiúscula"),
        bad("created_by, cover_color", `'${LIA}', 'azul'`, "cor sem hex"),
        bad("created_by, isbn_13", `'${LIA}', '123'`, "ISBN-13 curto"),
        bad("created_by, page_count", `'${LIA}', 0`, "zero páginas"),
        bad(
          "created_by, published_year",
          `'${LIA}', 2101`,
          "ano no futuro distante",
        ),
        bad("created_by, authors", `'${LIA}', '{""}'`, "autor em branco"),
        bad(
          "created_by, cover_url",
          `'${LIA}', 'https://exemplo.com/capa.jpg'`,
          "capa de outro domínio",
        ),
        bad(
          "created_by, source_id",
          `'${LIA}', 'OL1W'`,
          "manual com source_id",
        ),
        rejects(
          `insert into public.books (title, source, created_by) values ('Livro', 'openlibrary', '${LIA}');`,
          "Open Library sem source_id",
        ),
        rejects(
          `insert into public.books (title, source, created_by) values (repeat('a', 301), 'manual', '${LIA}');`,
          "título com 301",
        ),
        `insert into public.books (title, source, source_id, created_by, cover_url, cover_color, isbn_13, language, genres) values
          ('Dom Casmurro', 'openlibrary', 'OL1W', '${LIA}', 'https://covers.openlibrary.org/b/id/647501-L.jpg', '#ecc404', '9788535910667', 'pt', '{romance,classicos}');`,
        `insert into public.books (id, title, source, created_by, cover_url) values
          ('${SERTAO}', 'Grande Sertão: Veredas', 'manual', '${LIA}', 'covers/${SERTAO}');`,
        rejects(
          `insert into public.books (title, source, created_by, isbn_13) values ('Outro', 'manual', '${LIA}', '9788535910667');`,
          "ISBN-13 repetido",
        ),
        rejects(
          `insert into public.books (title, source, source_id, created_by) values ('Outro', 'openlibrary', 'OL1W', '${LIA}');`,
          "mesma obra da Open Library duas vezes",
        ),
        rejects(
          `insert into public.books (title, source, created_by, cover_url) values ('Outro', 'manual', '${LIA}', 'covers/${SERTAO}');`,
          "capa na pasta de outro livro",
        ),
      ),
    );
  });

  test("search_catalog acha sem acento, pelo autor e com erro de digitação", async () => {
    // Títulos que o seed não tem: cada resultado só pode vir deste teste
    const SAGARANA = "00000000-0000-4000-8000-000000000103";
    const ESTORIAS = "00000000-0000-4000-8000-000000000104";
    await runSql(
      sqlTransaction(
        ...readers(),
        books(),
        `insert into public.books (id, title, authors, source) values
          ('${SAGARANA}', 'Sagarana', '{"João Guimarães Rosa"}', 'manual'),
          ('${ESTORIAS}', 'Primeiras Estórias', '{"João Guimarães Rosa"}', 'manual');`,
        asAnon(),
        check(
          `exists (select 1 from public.search_catalog('sertao') where title = 'Grande Sertão: Veredas')`,
          "sertao acha Sertão",
        ),
        check(
          `exists (select 1 from public.search_catalog('estorias') where id = '${ESTORIAS}')`,
          "sem acento",
        ),
        check(
          `(select count(*) from public.search_catalog('guimaraes rosa', 20) where id in ('${SAGARANA}', '${ESTORIAS}')) = 2`,
          "pelo autor",
        ),
        check(
          `exists (select 1 from public.search_catalog('sagarna') where id = '${SAGARANA}')`,
          "tolera erro de digitação",
        ),
        check(
          `(select id from public.search_catalog('primeiras estorias') limit 1) = '${ESTORIAS}'`,
          "o mais parecido vem primeiro",
        ),
        check(
          `not exists (select 1 from public.search_catalog('s'))`,
          "uma letra não busca",
        ),
        check(
          `${count("public.search_catalog('o', 3)")} = 0`,
          "uma letra, de novo",
        ),
      ),
    );
  });
});

describe("estante", () => {
  const shelve = (user: string, book: string, status = "want") =>
    `insert into public.user_books (user_id, book_id, status) values ('${user}', '${book}', '${status}');`;

  test("estante de perfil público é de todos; a de privado, só de quem segue aceito", async () => {
    await runSql(
      sqlTransaction(
        ...readers(),
        books(),
        `update public.profiles set is_private = true where id = '${BENTO}';`,
        shelve(LIA, SERTAO, "read"),
        shelve(BENTO, HOBBIT, "reading"),
        `insert into public.quotes (user_id, book_id, text, page) values ('${BENTO}', '${HOBBIT}', 'Nem todos os que vagueiam estão perdidos.', 193);`,
        // Capitu pede para seguir o Bento, que é privado: fica pendente
        `insert into public.follows (follower_id, following_id) values ('${CAPITU}', '${BENTO}');`,
        asAnon(),
        check(
          `${count("public.user_books where user_id = '" + LIA + "'")} = 1`,
          "visitante vê estante pública",
        ),
        check(
          `${count("public.user_books where user_id = '" + BENTO + "'")} = 0`,
          "visitante não vê estante privada",
        ),
        check(
          `${count("public.quotes where user_id = '" + BENTO + "'")} = 0`,
          "nem as citações",
        ),
        asUser(CAPITU),
        check(
          `${count("public.user_books where user_id = '" + BENTO + "'")} = 0`,
          "pedido pendente não vê",
        ),
        asAdmin(),
        `update public.follows set status = 'accepted' where follower_id = '${CAPITU}' and following_id = '${BENTO}';`,
        asUser(CAPITU),
        check(
          `${count("public.user_books where user_id = '" + BENTO + "'")} = 1`,
          "seguidor aceito vê",
        ),
        check(
          `${count("public.quotes where user_id = '" + BENTO + "'")} = 1`,
          "e vê as citações",
        ),
        asUser(LIA),
        check(
          `${count("public.user_books where user_id = '" + BENTO + "'")} = 0`,
          "quem não segue não vê",
        ),
        asUser(BENTO),
        check(
          `${count("public.user_books where user_id = '" + BENTO + "'")} = 1`,
          "o dono vê a própria",
        ),
      ),
    );
  });

  test("ninguém grava na estante de outra pessoa", async () => {
    await runSql(
      sqlTransaction(
        ...readers(),
        books(),
        shelve(BENTO, HOBBIT),
        asUser(LIA),
        rejects(shelve(BENTO, SERTAO), "pôr livro na estante alheia"),
        `update public.user_books set status = 'abandoned' where user_id = '${BENTO}';`,
        `delete from public.user_books where user_id = '${BENTO}';`,
        rejects(
          `insert into public.quotes (user_id, book_id, text) values ('${BENTO}', '${HOBBIT}', 'falsa');`,
          "citar em nome alheio",
        ),
        shelve(LIA, SERTAO),
        rejects(
          `update public.user_books set user_id = '${BENTO}' where user_id = '${LIA}';`,
          "passar o próprio livro para a estante alheia",
        ),
        asAdmin(),
        check(
          `(select status from public.user_books where user_id = '${BENTO}' and book_id = '${HOBBIT}') = 'want'`,
          "a estante do Bento segue igual",
        ),
        check(
          `${count("public.user_books where user_id = '" + LIA + "'")} = 1`,
          "a Lia gravou na própria",
        ),
      ),
    );
  });

  test("status, nota, datas e página têm regra", async () => {
    const own = (set: string, label: string) =>
      rejects(
        `update public.user_books set ${set} where user_id = '${LIA}';`,
        label,
      );
    await runSql(
      sqlTransaction(
        ...readers(),
        books(),
        asUser(LIA),
        rejects(shelve(LIA, SERTAO, "lendo"), "status inválido"),
        shelve(LIA, SERTAO, "read"),
        rejects(shelve(LIA, SERTAO, "want"), "o mesmo livro duas vezes"),
        own("rating = 4.3", "nota 4.3"),
        own("rating = 0", "nota zero"),
        own("rating = 5.5", "nota acima de 5"),
        own(
          "started_at = '2024-05-10', finished_at = '2024-05-01'",
          "terminar antes de começar",
        ),
        own("current_page = -1", "página negativa"),
        `update public.user_books set rating = 4.5, started_at = '2024-05-01', finished_at = '2024-05-10', current_page = 504 where user_id = '${LIA}';`,
        asAdmin(),
        check(
          `(select rating from public.user_books where user_id = '${LIA}') = 4.5`,
          "meia estrela vale",
        ),
      ),
    );
  });
});

describe("seguir", () => {
  test("perfil público aceita na hora; privado vira pedido, mesmo se o cliente mandar aceito", async () => {
    await runSql(
      sqlTransaction(
        ...readers(),
        `update public.profiles set is_private = true where id = '${BENTO}';`,
        asUser(CAPITU),
        `insert into public.follows (follower_id, following_id) values ('${CAPITU}', '${LIA}');`,
        `insert into public.follows (follower_id, following_id, status) values ('${CAPITU}', '${BENTO}', 'accepted');`,
        asAdmin(),
        check(
          `(select status from public.follows where follower_id = '${CAPITU}' and following_id = '${LIA}') = 'accepted'`,
          "público: aceito",
        ),
        check(
          `(select status from public.follows where follower_id = '${CAPITU}' and following_id = '${BENTO}') = 'pending'`,
          "privado: pendente",
        ),
      ),
    );
  });

  test("só o seguido aceita o pedido, e ninguém segue em nome de outro", async () => {
    await runSql(
      sqlTransaction(
        ...readers(),
        `update public.profiles set is_private = true where id = '${BENTO}';`,
        `insert into public.follows (follower_id, following_id) values ('${CAPITU}', '${BENTO}');`,
        asUser(CAPITU),
        `update public.follows set status = 'accepted' where following_id = '${BENTO}';`,
        rejects(
          `insert into public.follows (follower_id, following_id) values ('${LIA}', '${BENTO}');`,
          "seguir em nome de outra pessoa",
        ),
        rejects(
          `insert into public.follows (follower_id, following_id) values ('${CAPITU}', '${CAPITU}');`,
          "seguir a si mesma",
        ),
        asAdmin(),
        check(
          `(select status from public.follows where follower_id = '${CAPITU}') = 'pending'`,
          "quem pediu não se aceita sozinha",
        ),
        asUser(BENTO),
        `update public.follows set status = 'accepted' where follower_id = '${CAPITU}';`,
        asAdmin(),
        check(
          `(select status from public.follows where follower_id = '${CAPITU}') = 'accepted'`,
          "o seguido aceitou",
        ),
      ),
    );
  });

  test("qualquer um dos dois desfaz; pedido pendente só os dois veem", async () => {
    await runSql(
      sqlTransaction(
        ...readers(),
        `update public.profiles set is_private = true where id = '${BENTO}';`,
        `insert into public.follows (follower_id, following_id) values ('${CAPITU}', '${BENTO}'), ('${LIA}', '${CAPITU}');`,
        asAnon(),
        check(
          `${count("public.follows where following_id = '" + BENTO + "'")} = 0`,
          "visitante não vê pedido",
        ),
        check(
          `${count("public.follows where following_id = '" + CAPITU + "'")} = 1`,
          "follow aceito público",
        ),
        asUser(BENTO),
        check(
          `${count("public.follows where following_id = '" + BENTO + "'")} = 1`,
          "o seguido vê o pedido",
        ),
        `delete from public.follows where follower_id = '${CAPITU}' and following_id = '${BENTO}';`,
        asUser(LIA),
        `delete from public.follows where follower_id = '${LIA}';`,
        asAdmin(),
        check(
          `${count("public.follows where follower_id in ('" + CAPITU + "', '" + LIA + "')")} = 0`,
          "os dois saíram",
        ),
      ),
    );
  });
});
