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
const LIVRO = "00000000-0000-4000-8000-000000000101";
const COLECAO = "00000000-0000-4000-8000-000000000201";

const count = (from: string) => `(select count(*) from ${from})`;
const activities = (where: string) => count(`public.activities where ${where}`);
const notifications = (where: string) =>
  count(`public.notifications where ${where}`);

// Ana e Bia são públicas; Caio é privado
const world = () => [
  createUser({ id: ANA, email: "ana@x.com" }),
  createUser({ id: BIA, email: "bia@x.com" }),
  createUser({ id: CAIO, email: "caio@x.com" }),
  `update public.profiles set is_private = true where id = '${CAIO}';`,
  `insert into public.books (id, title, source) values ('${LIVRO}', 'Vidas Secas', 'manual');`,
];

describe("atividades", () => {
  test("pôr na estante e mudar o status viram atividade; desfazer apaga", async () => {
    await runSql(
      sqlTransaction(
        ...world(),
        asUser(ANA),
        `insert into public.user_books (user_id, book_id, status) values ('${ANA}', '${LIVRO}', 'want');`,
        `update public.user_books set rating = 4 where user_id = '${ANA}';`,
        `update public.user_books set status = 'read' where user_id = '${ANA}';`,
        asAdmin(),
        check(
          `${activities(`actor_id = '${ANA}' and type = 'shelf_want' and book_id = '${LIVRO}'`)} = 1`,
          "adicionar gera shelf_want",
        ),
        check(
          `${activities(`actor_id = '${ANA}' and type = 'shelf_read'`)} = 1`,
          "mudar para lido gera shelf_read",
        ),
        check(
          `${activities(`actor_id = '${ANA}'`)} = 2`,
          "mudar a nota não gera nada",
        ),
        asUser(ANA),
        `delete from public.user_books where user_id = '${ANA}';`,
        asAdmin(),
        check(
          `${activities(`actor_id = '${ANA}'`)} = 0`,
          "tirar da estante apaga as atividades do livro",
        ),
      ),
    );
  });

  test("a cópia de outra estante leva quem foi copiado", async () => {
    await runSql(
      sqlTransaction(
        ...world(),
        asUser(BIA),
        `insert into public.user_books (user_id, book_id, status, copied_from_user_id) values ('${BIA}', '${LIVRO}', 'want', '${ANA}');`,
        asAdmin(),
        check(
          `${activities(`actor_id = '${BIA}' and type = 'shelf_want' and target_user_id = '${ANA}'`)} = 1`,
          "target_user_id da cópia",
        ),
      ),
    );
  });

  test("coleção pública e seus livros viram atividade; privada não", async () => {
    await runSql(
      sqlTransaction(
        ...world(),
        `insert into public.collections (id, owner_id, title) values ('${COLECAO}', '${ANA}', 'Nordeste em prosa');`,
        asUser(ANA),
        `insert into public.collection_items (collection_id, book_id, position) values ('${COLECAO}', '${LIVRO}', 'a0');`,
        `insert into public.collections (owner_id, title, visibility) values ('${ANA}', 'Segredo', 'private');`,
        `insert into public.collection_items (collection_id, book_id, position)
          select id, '${LIVRO}', 'a0' from public.collections where title = 'Segredo';`,
        asAdmin(),
        check(
          `${activities(`type = 'collection_create'`)} = 1`,
          "só a pública aparece",
        ),
        check(
          `${activities(`type = 'collection_add' and collection_id = '${COLECAO}' and book_id = '${LIVRO}'`)} = 1`,
          "livro na pública aparece",
        ),
        check(
          `${activities(`type = 'collection_add'`)} = 1`,
          "livro na privada não",
        ),
        asUser(ANA),
        `delete from public.collection_items where collection_id = '${COLECAO}';`,
        asAdmin(),
        check(
          `${activities(`type = 'collection_add'`)} = 0`,
          "tirar o livro apaga a atividade",
        ),
      ),
    );
  });

  test("atividade de coleção que ficou privada some do feed", async () => {
    await runSql(
      sqlTransaction(
        ...world(),
        `insert into public.collections (id, owner_id, title) values ('${COLECAO}', '${ANA}', 'Nordeste em prosa');`,
        asUser(ANA),
        `update public.collections set visibility = 'private' where id = '${COLECAO}';`,
        asUser(BIA),
        check(
          `${activities(`collection_id = '${COLECAO}'`)} = 0`,
          "a Bia não vê mais",
        ),
        asUser(ANA),
        check(
          `${activities(`collection_id = '${COLECAO}'`)} = 1`,
          "a dona segue vendo",
        ),
      ),
    );
  });

  test("seguir aceito vira atividade; pedido pendente, só quando aceito", async () => {
    await runSql(
      sqlTransaction(
        ...world(),
        asUser(BIA),
        `insert into public.follows (follower_id, following_id) values ('${BIA}', '${ANA}'), ('${BIA}', '${CAIO}');`,
        asAdmin(),
        check(
          `${activities(`type = 'follow' and actor_id = '${BIA}' and target_user_id = '${ANA}'`)} = 1`,
          "seguir a Ana",
        ),
        check(
          `${activities(`type = 'follow' and target_user_id = '${CAIO}'`)} = 0`,
          "pedido ainda não",
        ),
        asUser(CAIO),
        `update public.follows set status = 'accepted' where follower_id = '${BIA}';`,
        asAdmin(),
        check(
          `${activities(`type = 'follow' and target_user_id = '${CAIO}'`)} = 1`,
          "aceito, aparece",
        ),
        asUser(BIA),
        `delete from public.follows where following_id = '${ANA}';`,
        asAdmin(),
        check(
          `${activities(`type = 'follow' and target_user_id = '${ANA}'`)} = 0`,
          "deixar de seguir apaga",
        ),
      ),
    );
  });

  test("atividades de perfil privado só para quem segue aceito", async () => {
    await runSql(
      sqlTransaction(
        ...world(),
        asUser(CAIO),
        `insert into public.user_books (user_id, book_id, status) values ('${CAIO}', '${LIVRO}', 'reading');`,
        asAnon(),
        check(`${activities(`actor_id = '${CAIO}'`)} = 0`, "visitante não vê"),
        asUser(BIA),
        `insert into public.follows (follower_id, following_id) values ('${BIA}', '${CAIO}');`,
        check(
          `${activities(`actor_id = '${CAIO}'`)} = 0`,
          "pedido pendente não vê",
        ),
        asUser(CAIO),
        `update public.follows set status = 'accepted' where follower_id = '${BIA}';`,
        asUser(BIA),
        check(
          `${activities(`actor_id = '${CAIO}' and type = 'shelf_reading'`)} = 1`,
          "seguidora aceita vê",
        ),
      ),
    );
  });

  test("ninguém escreve atividade direto", async () => {
    await runSql(
      sqlTransaction(
        ...world(),
        asUser(ANA),
        rejects(
          `insert into public.activities (actor_id, type, book_id) values ('${ANA}', 'shelf_read', '${LIVRO}');`,
          "inserir atividade",
        ),
        asAdmin(),
        `insert into public.activities (actor_id, type, book_id) values ('${ANA}', 'shelf_read', '${LIVRO}');`,
        asUser(ANA),
        rejects(
          `delete from public.activities where actor_id = '${ANA}';`,
          "apagar atividade",
        ),
        rejects(
          `update public.activities set type = 'shelf_want' where actor_id = '${ANA}';`,
          "editar atividade",
        ),
      ),
    );
  });
});

describe("notificações", () => {
  test("seguir notifica: follow no público, follow_request no privado", async () => {
    await runSql(
      sqlTransaction(
        ...world(),
        asUser(BIA),
        `insert into public.follows (follower_id, following_id) values ('${BIA}', '${ANA}'), ('${BIA}', '${CAIO}');`,
        asAdmin(),
        check(
          `${notifications(`user_id = '${ANA}' and actor_id = '${BIA}' and type = 'follow'`)} = 1`,
          "novo seguidor",
        ),
        check(
          `${notifications(`user_id = '${CAIO}' and actor_id = '${BIA}' and type = 'follow_request'`)} = 1`,
          "pedido",
        ),
        asUser(CAIO),
        `update public.follows set status = 'accepted' where follower_id = '${BIA}';`,
        asAdmin(),
        check(
          `${notifications(`user_id = '${CAIO}' and type = 'follow_request'`)} = 0`,
          "aceito, o pedido vira seguidor",
        ),
        check(
          `${notifications(`user_id = '${CAIO}' and actor_id = '${BIA}' and type = 'follow'`)} = 1`,
          "um só aviso",
        ),
      ),
    );
  });

  test("pedido recusado ou desistido e follow desfeito tiram o aviso", async () => {
    await runSql(
      sqlTransaction(
        ...world(),
        asUser(BIA),
        `insert into public.follows (follower_id, following_id) values ('${BIA}', '${ANA}'), ('${BIA}', '${CAIO}');`,
        asUser(CAIO),
        `delete from public.follows where follower_id = '${BIA}' and following_id = '${CAIO}';`,
        asUser(BIA),
        `delete from public.follows where follower_id = '${BIA}' and following_id = '${ANA}';`,
        asAdmin(),
        check(
          `${notifications(`actor_id = '${BIA}'`)} = 0`,
          "nenhum aviso fantasma",
        ),
      ),
    );
  });

  test("curtida, cópia e convite notificam a dona e a convidada, nunca a si mesma", async () => {
    await runSql(
      sqlTransaction(
        ...world(),
        `insert into public.collections (id, owner_id, title, is_collaborative) values ('${COLECAO}', '${ANA}', 'Nordeste em prosa', true);`,
        asUser(ANA),
        `insert into public.collection_likes (user_id, collection_id) values ('${ANA}', '${COLECAO}');`,
        `insert into public.collection_members (collection_id, user_id) values ('${COLECAO}', '${BIA}');`,
        asUser(BIA),
        `insert into public.collection_likes (user_id, collection_id) values ('${BIA}', '${COLECAO}');`,
        `insert into public.collections (owner_id, title, visibility, copied_from_id) values ('${BIA}', 'Nordeste em prosa', 'private', '${COLECAO}');`,
        asAdmin(),
        check(
          `${notifications(`user_id = '${ANA}' and actor_id = '${BIA}' and type = 'collection_like' and refs ->> 'collection_id' = '${COLECAO}'`)} = 1`,
          "curtida da Bia",
        ),
        check(
          `${notifications(`user_id = '${ANA}' and actor_id = '${ANA}'`)} = 0`,
          "curtir a própria não avisa",
        ),
        check(
          `${notifications(`user_id = '${ANA}' and type = 'collection_copy' and refs ->> 'collection_id' = '${COLECAO}'`)} = 1`,
          "cópia",
        ),
        check(
          `${notifications(`user_id = '${BIA}' and actor_id = '${ANA}' and type = 'collection_invite' and refs ->> 'collection_id' = '${COLECAO}'`)} = 1`,
          "convite",
        ),
        asUser(BIA),
        `delete from public.collection_likes where user_id = '${BIA}';`,
        asAdmin(),
        check(
          `${notifications(`type = 'collection_like'`)} = 0`,
          "descurtir tira o aviso",
        ),
      ),
    );
  });

  test("cada um vê só as próprias e só marca como lida", async () => {
    await runSql(
      sqlTransaction(
        ...world(),
        asUser(BIA),
        `insert into public.follows (follower_id, following_id) values ('${BIA}', '${ANA}');`,
        check(`${notifications("true")} = 0`, "a Bia não vê o aviso da Ana"),
        `update public.notifications set read_at = now() where user_id = '${ANA}';`,
        asAnon(),
        check(`${notifications("true")} = 0`, "visitante não vê nada"),
        asUser(ANA),
        check(`${notifications("true")} = 1`, "a Ana vê o dela"),
        `update public.notifications set read_at = now() where user_id = '${ANA}';`,
        rejects(
          `update public.notifications set type = 'collection_like' where user_id = '${ANA}';`,
          "mudar o tipo",
        ),
        rejects(
          `insert into public.notifications (user_id, actor_id, type) values ('${ANA}', '${BIA}', 'follow');`,
          "inserir aviso",
        ),
        asAdmin(),
        check(
          `${notifications(`user_id = '${ANA}' and read_at is not null`)} = 1`,
          "marcou como lida",
        ),
      ),
    );
  });
});
