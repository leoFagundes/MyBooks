import { test } from "vitest";
import {
  asAdmin,
  asUser,
  check,
  createUser,
  rejects,
  runSql,
  sqlTransaction,
} from "./sql";

// Bloquear, silenciar e indicar um livro: o bloqueio fecha a estante, o
// seguir e as respostas; silenciar só esconde; indicar só a quem segue

const ANA = "00000000-0000-4000-8000-0000000000b1";
const BIA = "00000000-0000-4000-8000-0000000000b2";
const CAI = "00000000-0000-4000-8000-0000000000b3";
const TOPIC = "00000000-0000-4000-8000-0000000000bf";
const BOOK = "(select id from public.books order by id limit 1)";

const setup = [
  createUser({ id: ANA, email: "bloqueio-ana@example.com" }),
  createUser({ id: BIA, email: "bloqueio-bia@example.com" }),
  createUser({ id: CAI, email: "bloqueio-cai@example.com" }),
  // Contas antigas: o limite de conta nova do fórum não atrapalha o teste
  `update public.profiles set created_at = now() - interval '30 days' where id in ('${ANA}', '${BIA}', '${CAI}');`,
  `insert into public.user_books (user_id, book_id, status) values ('${ANA}', ${BOOK}, 'read');`,
];

const follows = (from: string, to: string) =>
  `insert into public.follows (follower_id, following_id) values ('${from}', '${to}');`;

test("bloquear desfaz o seguir, fecha a estante e não deixa seguir de novo", async () => {
  await runSql(
    sqlTransaction(
      ...setup,
      asUser(BIA),
      follows(BIA, ANA),
      check(
        `(select count(*) from public.user_books where user_id = '${ANA}') = 1`,
        "antes, a Bia vê a estante pública da Ana",
      ),
      asUser(ANA),
      follows(ANA, BIA),
      `select public.set_user_block('${BIA}', 'block');`,
      asAdmin(),
      check(
        `not exists (select 1 from public.follows where '${ANA}' in (follower_id, following_id) and '${BIA}' in (follower_id, following_id))`,
        "os dois seguires saíram",
      ),
      asUser(BIA),
      check(
        `(select count(*) from public.user_books where user_id = '${ANA}') = 0`,
        "a Bia não vê mais a estante da Ana",
      ),
      check(
        `public.viewer_blocked_by('${ANA}')`,
        "a Bia sabe que não pode ver",
      ),
      check(
        `(select count(*) from public.user_blocks) = 0`,
        "a linha do bloqueio é só da Ana",
      ),
      rejects(follows(BIA, ANA), "a Bia seguir a Ana de novo"),
      asUser(CAI),
      check(
        `(select count(*) from public.user_books where user_id = '${ANA}') = 1`,
        "quem não foi bloqueado continua vendo",
      ),
      asUser(ANA),
      `select public.set_user_block('${BIA}', null);`,
      asUser(BIA),
      follows(BIA, ANA),
      check(
        `(select count(*) from public.user_books where user_id = '${ANA}') = 1`,
        "desbloqueada, a Bia vê e segue de novo",
      ),
    ),
  );
});

test("silenciar tira do feed e do sino, mas a pessoa continua seguindo", async () => {
  await runSql(
    sqlTransaction(
      ...setup,
      asUser(ANA),
      follows(ANA, BIA),
      `select public.set_user_block('${BIA}', 'mute');`,
      asUser(BIA),
      follows(BIA, ANA),
      `insert into public.user_books (user_id, book_id, status) values ('${BIA}', ${BOOK}, 'want');`,
      asAdmin(),
      check(
        `(select count(*) from public.notifications where user_id = '${ANA}' and actor_id = '${BIA}') = 0`,
        "o seguir da Bia não chega ao sino da Ana",
      ),
      check(
        `exists (select 1 from public.follows where follower_id = '${BIA}' and following_id = '${ANA}')`,
        "a Bia segue normalmente",
      ),
      asUser(ANA),
      check(
        `not exists (select 1 from public.feed_activities() where actor_id = '${BIA}')`,
        "nada da Bia no feed da Ana",
      ),
      `select public.set_user_block('${BIA}', null);`,
      check(
        `exists (select 1 from public.feed_activities() where actor_id = '${BIA}')`,
        "sem o silenciar, a Bia volta ao feed",
      ),
    ),
  );
});

test("quem foi bloqueado não responde no tópico de quem bloqueou", async () => {
  await runSql(
    sqlTransaction(
      ...setup,
      asUser(ANA),
      `insert into public.forum_topics (id, category_id, author_id, title, body)
         values ('${TOPIC}', (select id from public.forum_categories where slug = 'geral'), '${ANA}', 'Um tópico da Ana', 'O texto');`,
      `select public.set_user_block('${BIA}', 'block');`,
      asUser(BIA),
      rejects(
        `insert into public.forum_replies (topic_id, author_id, body) values ('${TOPIC}', '${BIA}', 'Oi');`,
        "a Bia responder à Ana",
      ),
      asUser(CAI),
      `insert into public.forum_replies (topic_id, author_id, body) values ('${TOPIC}', '${CAI}', 'Oi');`,
    ),
  );
});

test("indicar um livro só a quem segue, uma vez, com aviso", async () => {
  await runSql(
    sqlTransaction(
      ...setup,
      asUser(ANA),
      rejects(
        `insert into public.book_recommendations (sender_id, recipient_id, book_id) values ('${ANA}', '${BIA}', ${BOOK});`,
        "indicar a quem não segue a Ana",
      ),
      asUser(BIA),
      follows(BIA, ANA),
      asUser(ANA),
      `insert into public.book_recommendations (sender_id, recipient_id, book_id, note) values ('${ANA}', '${BIA}', ${BOOK}, 'Você vai gostar');`,
      rejects(
        `insert into public.book_recommendations (sender_id, recipient_id, book_id) values ('${ANA}', '${BIA}', ${BOOK});`,
        "o mesmo livro duas vezes",
      ),
      rejects(
        `insert into public.book_recommendations (sender_id, recipient_id, book_id) values ('${BIA}', '${ANA}', ${BOOK});`,
        "em nome de outra pessoa",
      ),
      asAdmin(),
      check(
        `(select count(*) from public.notifications where user_id = '${BIA}' and type = 'book_recommendation') = 1`,
        "a Bia recebe o aviso",
      ),
      asUser(CAI),
      check(
        `(select count(*) from public.book_recommendations) = 0`,
        "quem não é das duas não vê a indicação",
      ),
      asUser(BIA),
      check(
        `(select count(*) from public.book_recommendations where recipient_id = '${BIA}') = 1`,
        "a Bia vê a indicação",
      ),
    ),
  );
});
