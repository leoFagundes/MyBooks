import { test } from "vitest";
import {
  asAnon,
  asUser,
  check,
  createUser,
  rejects,
  runSql,
  sqlTransaction,
} from "./sql";

const READER = "00000000-0000-4000-8000-0000000000a1";
const ADMIN = "00000000-0000-4000-8000-0000000000a2";

const setup = [
  createUser({ id: READER, email: "leitor-admin-teste@example.com" }),
  createUser({ id: ADMIN, email: "admin-teste@example.com" }),
  `insert into public.user_roles (user_id, role) values ('${ADMIN}', 'admin');`,
];

test("sem papel, nada do painel: papéis, números, usuários, auditoria e configurações", async () => {
  await runSql(
    sqlTransaction(
      ...setup,
      asUser(READER),
      check(
        "not public.is_admin() and not public.is_moderator()",
        "leitor não é admin",
      ),
      rejects("perform public.admin_overview();", "números do painel"),
      rejects("perform * from public.admin_users();", "lista de usuários"),
      rejects("perform * from public.user_roles;", "ler os papéis"),
      rejects(
        `insert into public.user_roles (user_id, role) values ('${READER}', 'admin');`,
        "se promover",
      ),
      check(
        "(select count(*) from public.admin_audit_log) = 0",
        "auditoria escondida",
      ),
      rejects(
        "update public.site_settings set value = '{}' where key = 'banner';",
        "mudar as configurações",
      ),
      check(
        "(select count(*) from public.site_settings) = 3",
        "as configurações são públicas para leitura",
      ),
      asAnon(),
      check("not public.is_admin()", "visitante não é admin"),
      rejects("perform public.admin_overview();", "visitante nos números"),
    ),
  );
});

test("o admin vê os números e a lista, com busca, filtro e ordem", async () => {
  await runSql(
    sqlTransaction(
      ...setup,
      `insert into public.account_sanctions (user_id, kind, reason, ends_at)
       values ('${READER}', 'suspension', 'Spam nos comentários', now() + interval '3 days');`,
      asUser(ADMIN),
      check(
        "public.is_admin() and public.is_moderator()",
        "admin também modera",
      ),
      check(
        "jsonb_array_length(public.admin_overview() -> 'growth') = 12",
        "12 semanas de crescimento",
      ),
      check(
        "(public.admin_overview() -> 'users' ->> 'total')::int >= 2",
        "conta os leitores",
      ),
      check(
        `(select sanction from public.admin_users(q => 'leitor-admin-teste') limit 1) = 'suspension'`,
        "acha pelo e-mail, com a suspensão",
      ),
      check(
        `(select count(*) from public.admin_users(status_filter => 'suspensos') where id = '${READER}') = 1`,
        "filtra os suspensos",
      ),
      check(
        `(select role from public.admin_users(q => 'admin-teste') where id = '${ADMIN}') = 'admin'`,
        "mostra o papel",
      ),
      check(
        "(select array_agg(username) from public.admin_users(sort => 'username', direction => 'asc', page_size => 5)) = (select array_agg(username order by username) from public.admin_users(sort => 'username', direction => 'asc', page_size => 5))",
        "ordena pelo @",
      ),
    ),
  );
});
