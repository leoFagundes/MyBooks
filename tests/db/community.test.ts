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

const ANA = "00000000-0000-4000-8000-0000000000d1";
const BIA = "00000000-0000-4000-8000-0000000000d2";
const MOD = "00000000-0000-4000-8000-0000000000d3";
const TOPIC = "00000000-0000-4000-8000-0000000000e1";
const REPLY = "00000000-0000-4000-8000-0000000000e2";

const setup = [
  createUser({ id: ANA, email: "comunidade-ana@example.com" }),
  createUser({ id: BIA, email: "comunidade-bia@example.com" }),
  createUser({ id: MOD, email: "comunidade-mod@example.com" }),
  `insert into public.user_roles (user_id, role) values ('${MOD}', 'moderator');`,
  // Contas antigas: o limite de conta nova não atrapalha o teste
  `update public.profiles set created_at = now() - interval '30 days' where id in ('${ANA}', '${BIA}', '${MOD}');`,
  `update public.profiles set username = 'bia_teste' where id = '${BIA}';`,
];

const topic = (id: string, author: string, body = "Corpo do tópico") =>
  `insert into public.forum_topics (id, category_id, author_id, title, body)
   values ('${id}', (select id from public.forum_categories where slug = 'geral'), '${author}', 'Um tópico', '${body}');`;

test("tópico, resposta aninhada um nível, menção e aviso de resposta", async () => {
  await runSql(
    sqlTransaction(
      ...setup,
      asUser(ANA),
      topic(TOPIC, ANA, "Oi @bia_teste, o que achou?"),
      asUser(BIA),
      `insert into public.forum_replies (id, topic_id, author_id, body) values ('${REPLY}', '${TOPIC}', '${BIA}', 'Gostei muito');`,
      `insert into public.forum_replies (topic_id, author_id, parent_id, body) values ('${TOPIC}', '${BIA}', '${REPLY}', 'E mais uma coisa');`,
      asAdmin(),
      // A resposta à resposta aninhada sobe para o primeiro nível
      `insert into public.forum_replies (topic_id, author_id, parent_id, body)
       select '${TOPIC}', '${ANA}', id, 'Terceiro nível?' from public.forum_replies where parent_id = '${REPLY}';`,
      check(
        `(select count(*) from public.forum_replies where parent_id = '${REPLY}') = 2`,
        "um nível só",
      ),
      check(
        `(select reply_count from public.forum_topics where id = '${TOPIC}') = 3`,
        "conta as respostas",
      ),
      check(
        `exists (select 1 from public.notifications where user_id = '${BIA}' and type = 'forum_mention')`,
        "a menção avisa",
      ),
      check(
        `(select count(*) from public.notifications where user_id = '${ANA}' and type = 'forum_reply') = 2`,
        "cada resposta da Bia avisa a Ana (que segue o tópico)",
      ),
    ),
  );
});

test("anti-spam: limite por minuto e nada de link nas primeiras publicações", async () => {
  await runSql(
    sqlTransaction(
      ...setup,
      asUser(ANA),
      rejects(
        topic(
          "00000000-0000-4000-8000-0000000000e9",
          ANA,
          "Veja https://exemplo.com",
        ),
        "link na primeira publicação",
      ),
      topic(TOPIC, ANA),
      `insert into public.forum_replies (topic_id, author_id, body) values
         ('${TOPIC}', '${ANA}', 'Um'), ('${TOPIC}', '${ANA}', 'Dois'), ('${TOPIC}', '${ANA}', 'Três');`,
      rejects(
        `insert into public.forum_replies (topic_id, author_id, body) values ('${TOPIC}', '${ANA}', 'Cinco no minuto');`,
        "a quinta publicação no mesmo minuto",
      ),
    ),
  );
});

test("a equipe tranca, oculta e revisa denúncias; o leitor não", async () => {
  await runSql(
    sqlTransaction(
      ...setup,
      asUser(ANA),
      topic(TOPIC, ANA),
      rejects(
        `update public.forum_topics set pinned = true where id = '${TOPIC}';`,
        "o autor se fixar",
      ),
      rejects(
        `perform public.moderate_topic('${TOPIC}', 'lock');`,
        "leitor trancar",
      ),
      asUser(BIA),
      `insert into public.content_reports (reporter_id, target_type, target_id, reason)
       values ('${BIA}', 'topic', '${TOPIC}', 'spam');`,
      asUser(MOD),
      `select public.moderate_topic('${TOPIC}', 'lock');`,
      asUser(BIA),
      rejects(
        `insert into public.forum_replies (topic_id, author_id, body) values ('${TOPIC}', '${BIA}', 'Trancado?');`,
        "responder tópico trancado",
      ),
      asUser(MOD),
      `select public.review_report((select id from public.content_reports where target_id = '${TOPIC}'), true);`,
      asUser(BIA),
      check(
        `(select count(*) from public.forum_topics where id = '${TOPIC}') = 0`,
        "o oculto some para os outros",
      ),
      asUser(ANA),
      check(
        `(select count(*) from public.forum_topics where id = '${TOPIC}') = 1`,
        "o autor ainda vê o seu",
      ),
    ),
  );
});
