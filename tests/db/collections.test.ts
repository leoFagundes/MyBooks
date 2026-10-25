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

const ANA = "00000000-0000-4000-8000-000000000001";
const BIA = "00000000-0000-4000-8000-000000000002";
const CAIO = "00000000-0000-4000-8000-000000000003";
const DORA = "00000000-0000-4000-8000-000000000004";

const PUBLICA = "00000000-0000-4000-8000-000000000201";
const PRIVADA = "00000000-0000-4000-8000-000000000202";
const DE_PRIVADO = "00000000-0000-4000-8000-000000000203";

const LIVRO_1 = "00000000-0000-4000-8000-000000000101";
const LIVRO_2 = "00000000-0000-4000-8000-000000000102";
const LIVRO_3 = "00000000-0000-4000-8000-000000000103";

const count = (from: string) => `(select count(*) from ${from})`;

// Ana e Bia são públicas, Caio é privado; Dora segue o Caio (aceito)
const world = () => [
  createUser({ id: ANA, email: "ana@x.com" }),
  createUser({ id: BIA, email: "bia@x.com" }),
  createUser({ id: CAIO, email: "caio@x.com" }),
  createUser({ id: DORA, email: "dora@x.com" }),
  `update public.profiles set is_private = true where id = '${CAIO}';`,
  `insert into public.follows (follower_id, following_id) values ('${DORA}', '${CAIO}');`,
  `update public.follows set status = 'accepted' where follower_id = '${DORA}';`,
  `insert into public.books (id, title, source) values
    ('${LIVRO_1}', 'Vidas Secas', 'manual'),
    ('${LIVRO_2}', 'Capitães da Areia', 'manual'),
    ('${LIVRO_3}', 'O Quinze', 'manual');`,
  `insert into public.collections (id, owner_id, title, visibility, is_collaborative) values
    ('${PUBLICA}', '${ANA}', 'Nordeste em prosa', 'public', true),
    ('${PRIVADA}', '${ANA}', 'Para reler', 'private', false),
    ('${DE_PRIVADO}', '${CAIO}', 'Do Caio', 'public', false);`,
  `insert into public.collection_items (collection_id, book_id, position) values
    ('${PUBLICA}', '${LIVRO_1}', 'a0'),
    ('${PUBLICA}', '${LIVRO_2}', 'a1'),
    ('${PRIVADA}', '${LIVRO_3}', 'a0'),
    ('${DE_PRIVADO}', '${LIVRO_1}', 'a0');`,
];

describe("quem vê coleções", () => {
  test("pública de perfil público é de todos; privada, do dono e dos membros", async () => {
    await runSql(
      sqlTransaction(
        ...world(),
        `update public.collections set is_collaborative = true where id = '${PRIVADA}';`,
        `insert into public.collection_members (collection_id, user_id) values ('${PRIVADA}', '${BIA}');`,
        asAnon(),
        check(
          `${count("public.collections where id = '" + PUBLICA + "'")} = 1`,
          "visitante vê a pública",
        ),
        check(
          `${count("public.collection_items where collection_id = '" + PUBLICA + "'")} = 2`,
          "e os livros dela",
        ),
        check(
          `${count("public.collections where id = '" + PRIVADA + "'")} = 0`,
          "visitante não vê a privada",
        ),
        check(
          `${count("public.collection_items where collection_id = '" + PRIVADA + "'")} = 0`,
          "nem os livros",
        ),
        asUser(DORA),
        check(
          `${count("public.collections where id = '" + PRIVADA + "'")} = 0`,
          "quem não é membro não vê",
        ),
        asUser(BIA),
        check(
          `${count("public.collections where id = '" + PRIVADA + "'")} = 1`,
          "a membro vê",
        ),
        check(
          `${count("public.collection_items where collection_id = '" + PRIVADA + "'")} = 1`,
          "e os livros",
        ),
        asUser(ANA),
        check(
          `${count("public.collections where id = '" + PRIVADA + "'")} = 1`,
          "a dona vê",
        ),
      ),
    );
  });

  test("pública de perfil privado só para seguidor aceito", async () => {
    await runSql(
      sqlTransaction(
        ...world(),
        asAnon(),
        check(
          `${count("public.collections where id = '" + DE_PRIVADO + "'")} = 0`,
          "visitante não vê",
        ),
        asUser(BIA),
        check(
          `${count("public.collections where id = '" + DE_PRIVADO + "'")} = 0`,
          "quem não segue não vê",
        ),
        asUser(DORA),
        check(
          `${count("public.collections where id = '" + DE_PRIVADO + "'")} = 1`,
          "seguidora aceita vê",
        ),
        check(
          `${count("public.collection_items where collection_id = '" + DE_PRIVADO + "'")} = 1`,
          "e os livros",
        ),
      ),
    );
  });
});

describe("quem edita coleções", () => {
  test("membro de coleção colaborativa adiciona, reordena e anota; quem não é, não", async () => {
    await runSql(
      sqlTransaction(
        ...world(),
        `insert into public.collection_members (collection_id, user_id) values ('${PUBLICA}', '${BIA}');`,
        asUser(BIA),
        `insert into public.collection_items (collection_id, book_id, position, added_by) values ('${PUBLICA}', '${LIVRO_3}', 'a2', '${BIA}');`,
        `update public.collection_items set position = 'Zz' where collection_id = '${PUBLICA}' and book_id = '${LIVRO_3}';`,
        `update public.collection_items set note = 'O sertão em poucas páginas.' where collection_id = '${PUBLICA}' and book_id = '${LIVRO_1}';`,
        // A RLS filtra em silêncio: o "título intacto" lá embaixo prova
        `update public.collections set title = 'Outro' where id = '${PUBLICA}';`,
        asUser(CAIO),
        rejects(
          `insert into public.collection_items (collection_id, book_id, position, added_by) values ('${PUBLICA}', '${LIVRO_3}', 'a3', '${CAIO}');`,
          "quem não é membro adicionar",
        ),
        `update public.collection_items set position = 'a9' where collection_id = '${PUBLICA}' and book_id = '${LIVRO_1}';`,
        `delete from public.collection_items where collection_id = '${PUBLICA}';`,
        asAdmin(),
        check(
          `(select string_agg(book_id::text, ',' order by position) from public.collection_items where collection_id = '${PUBLICA}') = '${LIVRO_3},${LIVRO_1},${LIVRO_2}'`,
          "a ordem da Bia ficou e o Caio não mexeu",
        ),
        check(
          `(select note from public.collection_items where book_id = '${LIVRO_1}' and collection_id = '${PUBLICA}') = 'O sertão em poucas páginas.'`,
          "nota gravada",
        ),
        check(
          `(select title from public.collections where id = '${PUBLICA}') = 'Nordeste em prosa'`,
          "título intacto",
        ),
      ),
    );
  });

  test("em coleção que não é colaborativa, só a dona mexe", async () => {
    await runSql(
      sqlTransaction(
        ...world(),
        asUser(ANA),
        rejects(
          `insert into public.collection_members (collection_id, user_id) values ('${PRIVADA}', '${BIA}');`,
          "convidar para coleção não colaborativa",
        ),
        `insert into public.collection_items (collection_id, book_id, position, added_by) values ('${PRIVADA}', '${LIVRO_1}', 'a1', '${ANA}');`,
        `update public.collections set title = 'Para reler devagar', emoji = '📚', description = 'Os que pedem segunda leitura.' where id = '${PRIVADA}';`,
        asAdmin(),
        check(
          `${count("public.collection_items where collection_id = '" + PRIVADA + "'")} = 2`,
          "a dona adicionou",
        ),
        check(
          `(select emoji from public.collections where id = '${PRIVADA}') = '📚'`,
          "a dona editou",
        ),
      ),
    );
  });

  test("membro perde a edição quando a coleção deixa de ser colaborativa", async () => {
    await runSql(
      sqlTransaction(
        ...world(),
        `insert into public.collection_members (collection_id, user_id) values ('${PUBLICA}', '${BIA}');`,
        `update public.collections set is_collaborative = false where id = '${PUBLICA}';`,
        asUser(BIA),
        rejects(
          `insert into public.collection_items (collection_id, book_id, position, added_by) values ('${PUBLICA}', '${LIVRO_3}', 'a2', '${BIA}');`,
          "ex-colaboradora adicionar",
        ),
        check(
          `${count("public.collections where id = '" + PUBLICA + "'")} = 1`,
          "mas segue vendo a pública",
        ),
      ),
    );
  });

  test("só a dona convida e remove; a membro pode sair; ninguém entra sozinho", async () => {
    await runSql(
      sqlTransaction(
        ...world(),
        asUser(BIA),
        rejects(
          `insert into public.collection_members (collection_id, user_id) values ('${PUBLICA}', '${BIA}');`,
          "entrar sozinha",
        ),
        asUser(ANA),
        rejects(
          `insert into public.collection_members (collection_id, user_id) values ('${PUBLICA}', '${ANA}');`,
          "a dona como membro",
        ),
        `insert into public.collection_members (collection_id, user_id) values ('${PUBLICA}', '${BIA}'), ('${PUBLICA}', '${DORA}');`,
        asUser(DORA),
        `delete from public.collection_members where collection_id = '${PUBLICA}' and user_id = '${BIA}';`,
        `delete from public.collection_members where collection_id = '${PUBLICA}' and user_id = '${DORA}';`,
        asAdmin(),
        check(
          `(select string_agg(user_id::text, ',') from public.collection_members where collection_id = '${PUBLICA}') = '${BIA}'`,
          "a Dora saiu e não tirou a Bia",
        ),
        asUser(ANA),
        `delete from public.collection_members where collection_id = '${PUBLICA}' and user_id = '${BIA}';`,
        asAdmin(),
        check(
          `${count("public.collection_members where collection_id = '" + PUBLICA + "'")} = 0`,
          "a dona removeu",
        ),
      ),
    );
  });

  test("até 20 colaboradores", async () => {
    const people = Array.from(
      { length: 21 },
      (_, i) =>
        `00000000-0000-4000-8000-0000000003${String(i).padStart(2, "0")}`,
    );
    await runSql(
      sqlTransaction(
        ...world(),
        ...people.map((id, i) => createUser({ id, email: `leitor${i}@x.com` })),
        asUser(ANA),
        `insert into public.collection_members (collection_id, user_id) values ${people
          .slice(0, 20)
          .map((id) => `('${PUBLICA}', '${id}')`)
          .join(", ")};`,
        rejects(
          `insert into public.collection_members (collection_id, user_id) values ('${PUBLICA}', '${people[20]}');`,
          "o 21º colaborador",
        ),
      ),
    );
  });
});

describe("curtir, salvar e copiar", () => {
  test("curtidas aparecem com a coleção; salvos, só para quem salvou", async () => {
    await runSql(
      sqlTransaction(
        ...world(),
        asUser(BIA),
        `insert into public.collection_likes (user_id, collection_id) values ('${BIA}', '${PUBLICA}');`,
        `insert into public.collection_saves (user_id, collection_id) values ('${BIA}', '${PUBLICA}');`,
        rejects(
          `insert into public.collection_likes (user_id, collection_id) values ('${BIA}', '${PRIVADA}');`,
          "curtir coleção que não vê",
        ),
        rejects(
          `insert into public.collection_likes (user_id, collection_id) values ('${DORA}', '${PUBLICA}');`,
          "curtir em nome de outra pessoa",
        ),
        asAnon(),
        check(
          `${count("public.collection_likes where collection_id = '" + PUBLICA + "'")} = 1`,
          "visitante vê a curtida",
        ),
        check(
          `${count("public.collection_saves where collection_id = '" + PUBLICA + "'")} = 0`,
          "visitante não vê o salvo",
        ),
        asUser(ANA),
        check(
          `${count("public.collection_saves where collection_id = '" + PUBLICA + "'")} = 0`,
          "nem a dona",
        ),
        asUser(BIA),
        check(
          `${count("public.collection_saves where user_id = '" + BIA + "'")} = 1`,
          "quem salvou vê",
        ),
        `delete from public.collection_likes where user_id = '${BIA}';`,
        asAdmin(),
        check(
          `${count("public.collection_likes where collection_id = '" + PUBLICA + "'")} = 0`,
          "descurtiu",
        ),
      ),
    );
  });

  test("a cópia guarda a origem e a dona dela, e só se copia o que se vê", async () => {
    await runSql(
      sqlTransaction(
        ...world(),
        asUser(BIA),
        `insert into public.collections (owner_id, title, visibility, copied_from_id, copied_from_owner_id)
          values ('${BIA}', 'Nordeste em prosa', 'private', '${PUBLICA}', '${BIA}');`,
        rejects(
          `insert into public.collections (owner_id, title, copied_from_id) values ('${BIA}', 'Roubada', '${PRIVADA}');`,
          "copiar coleção invisível",
        ),
        rejects(
          `update public.collections set copied_from_id = null where owner_id = '${BIA}';`,
          "apagar o crédito",
        ),
        asAdmin(),
        check(
          `(select copied_from_owner_id from public.collections where owner_id = '${BIA}') = '${ANA}'`,
          "o crédito vem da origem, não do cliente",
        ),
        `delete from public.collections where id = '${PUBLICA}';`,
        check(
          `(select copied_from_owner_id from public.collections where owner_id = '${BIA}') = '${ANA}'`,
          "o crédito fica mesmo sem a origem",
        ),
      ),
    );
  });
});

describe("formato", () => {
  test("a ordem é por byte: 0-9 < A-Z < a-z, como o índice fracionário", async () => {
    await runSql(
      sqlTransaction(
        ...world(),
        `delete from public.collection_items where collection_id = '${PUBLICA}';`,
        `insert into public.collection_items (collection_id, book_id, position) values
          ('${PUBLICA}', '${LIVRO_1}', 'aa'),
          ('${PUBLICA}', '${LIVRO_2}', 'a1'),
          ('${PUBLICA}', '${LIVRO_3}', 'aZ');`,
        check(
          `(select string_agg(position, ',' order by position) from public.collection_items where collection_id = '${PUBLICA}') = 'a1,aZ,aa'`,
          "a1 < aZ < aa",
        ),
        check(
          `'a0' < 'a1' collate "C" and 'a1' < 'aV' collate "C" and 'aV' < 'b0' collate "C"`,
          "a0 < a1 < aV < b0",
        ),
      ),
    );
  });

  test("título, descrição, emoji, nota e posição têm regra", async () => {
    const own = (statement: string, label: string) => rejects(statement, label);
    await runSql(
      sqlTransaction(
        ...world(),
        asUser(ANA),
        own(
          `update public.collections set title = repeat('a', 81) where id = '${PUBLICA}';`,
          "título com 81",
        ),
        own(
          `update public.collections set title = '  ' where id = '${PUBLICA}';`,
          "título em branco",
        ),
        own(
          `update public.collections set description = repeat('a', 301) where id = '${PUBLICA}';`,
          "descrição com 301",
        ),
        own(
          `update public.collections set emoji = 'ab' where id = '${PUBLICA}';`,
          "letras no lugar do emoji",
        ),
        own(
          `update public.collections set visibility = 'secreta' where id = '${PUBLICA}';`,
          "visibilidade inválida",
        ),
        own(
          `update public.collection_items set note = repeat('a', 201) where collection_id = '${PUBLICA}';`,
          "nota com 201",
        ),
        own(
          `update public.collection_items set position = 'a-0' where collection_id = '${PUBLICA}';`,
          "posição fora da base 62",
        ),
        own(
          `update public.collections set owner_id = '${BIA}' where id = '${PUBLICA}';`,
          "passar a coleção adiante",
        ),
        `update public.collections set emoji = '👩‍👩‍👧', title = repeat('a', 80), description = repeat('b', 300) where id = '${PUBLICA}';`,
        `update public.collection_items set note = repeat('c', 200) where collection_id = '${PUBLICA}' and book_id = '${LIVRO_1}';`,
      ),
    );
  });
});
