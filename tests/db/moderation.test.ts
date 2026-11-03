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

const READER = "00000000-0000-4000-8000-0000000000b1";
const OTHER = "00000000-0000-4000-8000-0000000000b2";
const MOD = "00000000-0000-4000-8000-0000000000b3";
const DUP = "00000000-0000-4000-8000-0000000000c1";
const KEEP = "00000000-0000-4000-8000-0000000000c2";

const setup = [
  createUser({ id: READER, email: "moderacao-leitor@example.com" }),
  createUser({ id: OTHER, email: "moderacao-outra@example.com" }),
  createUser({ id: MOD, email: "moderacao-mod@example.com" }),
  `insert into public.user_roles (user_id, role) values ('${MOD}', 'moderator');`,
];

test("livro manual nasce pendente, fora da busca, e só a equipe revisa", async () => {
  await runSql(
    sqlTransaction(
      ...setup,
      asUser(READER),
      `insert into public.books (id, title, authors, source, created_by)
       values ('${DUP}', 'Zzqx Livro de Teste', '{Autora Teste}', 'manual', '${READER}');`,
      check(
        `(select moderation_status from public.books where id = '${DUP}') = 'pending'`,
        "nasce pendente",
      ),
      check(
        "(select count(*) from public.search_catalog('Zzqx Livro')) = 0",
        "fora da busca",
      ),
      rejects(
        `update public.books set moderation_status = 'approved' where id = '${DUP}';`,
        "o criador se aprovar",
      ),
      rejects(
        `perform public.review_manual_book('${DUP}', 'approve');`,
        "leitor revisar",
      ),
      asUser(MOD),
      `select public.review_manual_book('${DUP}', 'approve');`,
      check(
        "(select count(*) from public.search_catalog('Zzqx Livro')) = 1",
        "aprovado, entra na busca",
      ),
      asAdmin(),
      check(
        `(select count(*) from public.notifications where user_id = '${READER}' and type = 'catalog_review' and refs ->> 'kind' = 'book_approved') = 1`,
        "o criador é avisado",
      ),
    ),
  );
});

test("mesclar move estantes, coleções e citações, e resolve quem tinha os dois", async () => {
  await runSql(
    sqlTransaction(
      ...setup,
      `insert into public.books (id, title, authors, source, created_by) values
         ('${DUP}', 'Duplicado', '{A}', 'manual', '${READER}'),
         ('${KEEP}', 'Original', '{A}', 'manual', '${OTHER}');`,
      // A leitora tem os dois (o duplicado com nota); a outra só o duplicado
      `insert into public.user_books (user_id, book_id, status, rating) values
         ('${READER}', '${DUP}', 'read', 4),
         ('${READER}', '${KEEP}', 'want', null),
         ('${OTHER}', '${DUP}', 'reading', null);`,
      `insert into public.quotes (user_id, book_id, text) values ('${OTHER}', '${DUP}', 'Uma citação de teste');`,
      asUser(MOD),
      `select public.review_manual_book('${DUP}', 'merge', null, null, '${KEEP}');`,
      check(
        `(select count(*) from public.user_books where book_id = '${DUP}') = 0`,
        "nada fica no duplicado",
      ),
      check(
        `(select rating from public.user_books where user_id = '${READER}' and book_id = '${KEEP}') = 4`,
        "quem tinha os dois ganha a nota do outro",
      ),
      check(
        `(select count(*) from public.user_books where user_id = '${OTHER}' and book_id = '${KEEP}') = 1`,
        "quem só tinha o duplicado passa para o original",
      ),
      check(
        `(select count(*) from public.quotes where book_id = '${KEEP}') = 1`,
        "a citação muda de livro",
      ),
      check(
        `public.book_redirect('${DUP}') = '${KEEP}'`,
        "a URL antiga redireciona",
      ),
      asAnon(),
      check(
        `(select count(*) from public.books where id = '${DUP}') = 0`,
        "o duplicado some para o público",
      ),
    ),
  );
});

test("sugestões: no próprio nome, até 5 esperando, e rejeitar pede a nota", async () => {
  const suggest = (n: number) =>
    `insert into public.book_change_requests (book_id, user_id, type, changes, reason)
     values ('${KEEP}', '${READER}', 'edit', '{"title": "Título ${n}"}', 'Erro de digitação');`;
  await runSql(
    sqlTransaction(
      ...setup,
      `insert into public.books (id, title, authors, source, created_by)
       values ('${KEEP}', 'Original', '{A}', 'manual', '${OTHER}');`,
      asUser(READER),
      rejects(
        `insert into public.book_change_requests (book_id, user_id, type, reason)
         values ('${KEEP}', '${OTHER}', 'edit', 'Em nome de outra');`,
        "sugerir em nome de outra pessoa",
      ),
      ...[1, 2, 3, 4, 5].map(suggest),
      rejects(suggest(6), "a sexta sugestão pendente"),
      asUser(MOD),
      rejects(
        `perform public.review_change_request((select id from public.book_change_requests limit 1), false);`,
        "rejeitar sem nota",
      ),
      `select public.review_change_request((select id from public.book_change_requests where changes ->> 'title' = 'Título 1'), true);`,
      check(
        `(select title from public.books where id = '${KEEP}') = 'Título 1'`,
        "aprovar aplica a edição",
      ),
    ),
  );
});
