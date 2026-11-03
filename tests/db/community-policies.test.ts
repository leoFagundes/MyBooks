import { test } from "vitest";
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

// MELHORIAS 9.4: o leitor comum não lê nem escreve o que não deve nas tabelas
// das fases 6 a 8 (comunidade, sugestões, denúncias, sanções) e não vira
// equipe por caminho nenhum.

const ANA = "00000000-0000-4000-8000-0000000000f1";
const BIA = "00000000-0000-4000-8000-0000000000f2";
const TOPIC = "00000000-0000-4000-8000-0000000000f3";
const SUGGESTION = "00000000-0000-4000-8000-0000000000f4";

const setup = [
  createUser({ id: ANA, email: "politicas-ana@example.com" }),
  createUser({ id: BIA, email: "politicas-bia@example.com" }),
  // Contas antigas: o limite de conta nova não atrapalha o teste
  `update public.profiles set created_at = now() - interval '30 days' where id in ('${ANA}', '${BIA}');`,
  asUser(ANA),
  `insert into public.forum_topics (id, category_id, author_id, title, body)
   values ('${TOPIC}', (select id from public.forum_categories where slug = 'geral'), '${ANA}', 'O tópico da Ana', 'Corpo');`,
  `insert into public.feature_suggestions (id, author_id, title, body, category)
   values ('${SUGGESTION}', '${ANA}', 'A sugestão da Ana', 'Corpo', 'melhoria');`,
];

test("fórum: ninguém escreve no nome dos outros nem mexe no que é da equipe", async () => {
  await runSql(
    sqlTransaction(
      ...setup,
      asUser(BIA),
      rejects(
        `insert into public.forum_topics (category_id, author_id, title, body)
         values ((select id from public.forum_categories where slug = 'geral'), '${ANA}', 'Em nome da Ana', 'Corpo');`,
        "abrir tópico no nome de outra pessoa",
      ),
      `update public.forum_topics set body = 'Mudado pela Bia', deleted_at = now() where id = '${TOPIC}';`,
      rejects(
        `insert into public.forum_replies (topic_id, author_id, body) values ('${TOPIC}', '${ANA}', 'Em nome da Ana');`,
        "responder no nome de outra pessoa",
      ),
      rejects(
        `insert into public.forum_reactions (user_id, topic_id, kind) values ('${ANA}', '${TOPIC}', 'like');`,
        "curtir no nome de outra pessoa",
      ),
      rejects(
        `insert into public.forum_subscriptions (user_id, topic_id) values ('${ANA}', '${TOPIC}');`,
        "seguir tópico por outra pessoa",
      ),
      rejects(
        `insert into public.forum_topic_books (topic_id, book_id) values ('${TOPIC}', (select id from public.books limit 1));`,
        "pôr livro no tópico dos outros",
      ),
      check(
        "(select count(*) from public.forum_subscriptions) = 0",
        "não vê quem segue o quê",
      ),
      rejects(
        "insert into public.forum_categories (slug, name) values ('minha', 'Minha categoria');",
        "criar categoria",
      ),
      rejects(
        "update public.forum_categories set name = 'Outra' where slug = 'geral';",
        "renomear categoria",
      ),
      asUser(ANA),
      rejects(
        `update public.forum_topics set locked = true where id = '${TOPIC}';`,
        "o autor trancar",
      ),
      rejects(
        `update public.forum_topics set hidden_at = null, reply_count = 99 where id = '${TOPIC}';`,
        "o autor mexer na moderação e nos contadores",
      ),
      rejects(
        `update public.forum_topics set category_id = (select id from public.forum_categories where slug = 'ajuda') where id = '${TOPIC}';`,
        "o autor mover de categoria",
      ),
      asAdmin(),
      check(
        `(select body = 'Corpo' and deleted_at is null from public.forum_topics where id = '${TOPIC}')`,
        "a Bia não editou nem apagou o tópico da Ana",
      ),
      asAnon(),
      check(
        `(select count(*) from public.forum_topics where id = '${TOPIC}') = 1`,
        "o fórum é público para ler",
      ),
      rejects(
        `insert into public.forum_replies (topic_id, author_id, body) values ('${TOPIC}', '${ANA}', 'Anônimo');`,
        "visitante responder",
      ),
    ),
  );
});

test("sugestões: o status, a resposta oficial e os votos dos outros são intocáveis", async () => {
  await runSql(
    sqlTransaction(
      ...setup,
      rejects(
        `update public.feature_suggestions set status = 'concluida' where id = '${SUGGESTION}';`,
        "o autor mudar o status",
      ),
      rejects(
        `update public.feature_suggestions set official_response = 'Feito!', vote_count = 500 where id = '${SUGGESTION}';`,
        "o autor escrever a resposta oficial ou os votos",
      ),
      rejects(
        `insert into public.feature_suggestions (author_id, title, body, category, status)
         values ('${ANA}', 'Já nasce planejada', 'Corpo', 'melhoria', 'planejada');`,
        "nascer com outro status",
      ),
      asUser(BIA),
      rejects(
        `perform public.set_suggestion_status('${SUGGESTION}', 'concluida', 'Feito');`,
        "leitor responder oficialmente",
      ),
      rejects(
        `insert into public.suggestion_votes (suggestion_id, user_id) values ('${SUGGESTION}', '${ANA}');`,
        "votar por outra pessoa",
      ),
      `insert into public.suggestion_votes (suggestion_id, user_id) values ('${SUGGESTION}', '${BIA}');`,
      rejects(
        `insert into public.suggestion_votes (suggestion_id, user_id) values ('${SUGGESTION}', '${BIA}');`,
        "votar duas vezes",
      ),
      rejects(
        `insert into public.suggestion_comments (suggestion_id, author_id, body) values ('${SUGGESTION}', '${ANA}', 'Em nome da Ana');`,
        "comentar no nome de outra pessoa",
      ),
      `update public.feature_suggestions set title = 'Mudada pela Bia' where id = '${SUGGESTION}';`,
      `delete from public.suggestion_votes where user_id = '${ANA}';`,
      asAdmin(),
      check(
        `(select title = 'A sugestão da Ana' and status = 'nova' and vote_count = 2 from public.feature_suggestions where id = '${SUGGESTION}')`,
        "a sugestão da Ana segue igual, com o voto dela e o da Bia",
      ),
    ),
  );
});

test("denúncias, sanções, avisos e preferências: cada um vê só o seu", async () => {
  await runSql(
    sqlTransaction(
      ...setup,
      asUser(BIA),
      `insert into public.content_reports (reporter_id, target_type, target_id, reason)
       values ('${BIA}', 'topic', '${TOPIC}', 'spam');`,
      rejects(
        `insert into public.content_reports (reporter_id, target_type, target_id, reason)
         values ('${ANA}', 'topic', '${TOPIC}', 'spam');`,
        "denunciar no nome de outra pessoa",
      ),
      rejects(
        `insert into public.content_reports (reporter_id, target_type, target_id, reason, status)
         values ('${BIA}', 'topic', '${TOPIC}', 'outro', 'resolved');`,
        "denúncia que já nasce resolvida",
      ),
      rejects(
        `update public.content_reports set status = 'dismissed' where reporter_id = '${BIA}';`,
        "dar a própria denúncia por resolvida",
      ),
      rejects(
        `perform public.review_report((select id from public.content_reports limit 1), true);`,
        "leitor revisar denúncia",
      ),
      asUser(ANA),
      check(
        "(select count(*) from public.content_reports) = 0",
        "quem foi denunciado não vê quem denunciou",
      ),
      asAdmin(),
      `insert into public.account_sanctions (user_id, kind, reason, ends_at)
       values ('${ANA}', 'suspension', 'Teste de sanção', now() + interval '1 day');`,
      `insert into public.notifications (user_id, type, refs) values ('${ANA}', 'follow', '{}');`,
      `insert into public.profile_preferences (profile_id, preferences) values ('${ANA}', '{}')
       on conflict (profile_id) do nothing;`,
      asUser(BIA),
      check(
        "(select count(*) from public.account_sanctions) = 0",
        "sanções só para a equipe",
      ),
      check(
        `(select count(*) from public.notifications where user_id = '${ANA}') = 0`,
        "os avisos dos outros",
      ),
      `update public.notifications set read_at = now() where user_id = '${ANA}';`,
      check(
        `(select count(*) from public.profile_preferences where profile_id = '${ANA}') = 0`,
        "as preferências dos outros",
      ),
      rejects(
        `insert into public.account_sanctions (user_id, kind, reason) values ('${ANA}', 'ban', 'Banida pela Bia');`,
        "leitor aplicar sanção",
      ),
      asUser(ANA),
      rejects(
        `update public.account_sanctions set lifted_at = now() where user_id = '${ANA}';`,
        "tirar a própria sanção",
      ),
      rejects(
        `insert into public.user_roles (user_id, role) values ('${ANA}', 'moderator');`,
        "se fazer moderadora",
      ),
      check(
        "not public.is_moderator() and not public.is_admin()",
        "continua sem papel",
      ),
      asAdmin(),
      check(
        `(select read_at is null from public.notifications where user_id = '${ANA}' and type = 'follow' order by created_at desc limit 1)`,
        "a Bia não marcou o aviso da Ana como lido",
      ),
      check(
        `(select lifted_at is null from public.account_sanctions where user_id = '${ANA}')`,
        "a sanção continua",
      ),
    ),
  );
});
