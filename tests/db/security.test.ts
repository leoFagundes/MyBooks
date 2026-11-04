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

// A varredura de segurança (ajustes finais): o aviso que não se repete, o
// e-mail só para o admin e a pergunta "tenho senha?" só sobre a própria conta

const ANA = "00000000-0000-4000-8000-0000000000a1";
const BIA = "00000000-0000-4000-8000-0000000000a2";
const MOD = "00000000-0000-4000-8000-0000000000a3";
const ADM = "00000000-0000-4000-8000-0000000000a4";

const setup = [
  createUser({ id: ANA, email: "seguranca-ana@example.com" }),
  createUser({ id: BIA, email: "seguranca-bia@example.com" }),
  createUser({ id: MOD, email: "seguranca-mod@example.com" }),
  createUser({ id: ADM, email: "seguranca-adm@example.com" }),
  `update public.profiles set username = 'seguranca_ana' where id = '${ANA}';`,
  `insert into public.user_roles (user_id, role) values ('${MOD}', 'moderator'), ('${ADM}', 'admin');`,
];

const follow = `insert into public.follows (follower_id, following_id) values ('${BIA}', '${ANA}');`;
const unfollow = `delete from public.follows where follower_id = '${BIA}' and following_id = '${ANA}';`;

test("seguir e deixar de seguir em sequência avisa uma vez só em 24 horas", async () => {
  await runSql(
    sqlTransaction(
      ...setup,
      asUser(BIA),
      follow,
      asAdmin(),
      check(
        `(select count(*) from public.notifications where user_id = '${ANA}' and type = 'follow') = 1`,
        "o primeiro seguir avisa",
      ),
      asUser(BIA),
      unfollow,
      follow,
      unfollow,
      follow,
      asAdmin(),
      check(
        `(select count(*) from public.notifications where user_id = '${ANA}' and type = 'follow') = 0`,
        "o vaivém não avisa de novo (o aviso do primeiro saiu com o deixar de seguir)",
      ),
      check(
        `(select count(*) from private.notice_log where user_id = '${ANA}' and type = 'follow') = 1`,
        "um envio só no registro",
      ),
      // Passadas as 24 horas, avisa de novo
      `update private.notice_log set sent_at = now() - interval '25 hours' where user_id = '${ANA}';`,
      asUser(BIA),
      unfollow,
      follow,
      asAdmin(),
      check(
        `(select count(*) from public.notifications where user_id = '${ANA}' and type = 'follow') = 1`,
        "depois de 24 horas, o aviso volta",
      ),
      asUser(ANA),
      rejects(
        "perform * from private.notice_log;",
        "o registro fica fora do alcance de quem usa",
      ),
    ),
  );
});

test("o e-mail no painel é só do admin, inclusive na busca", async () => {
  await runSql(
    sqlTransaction(
      ...setup,
      asUser(MOD),
      check(
        `(select email from public.admin_users(q => 'seguranca_ana')) is null`,
        "quem modera não vê o e-mail",
      ),
      check(
        `not exists (select 1 from public.admin_users(q => 'seguranca-ana@example'))`,
        "quem modera não acha ninguém pelo e-mail",
      ),
      asUser(ADM),
      check(
        `(select email from public.admin_users(q => 'seguranca_ana')) = 'seguranca-ana@example.com'`,
        "o admin vê o e-mail",
      ),
      check(
        `exists (select 1 from public.admin_users(q => 'seguranca-ana@example'))`,
        "o admin acha pelo e-mail",
      ),
    ),
  );
});

test("saber se tem senha, só sobre a própria conta", async () => {
  await runSql(
    sqlTransaction(
      ...setup,
      asAdmin(),
      `update auth.users set encrypted_password = 'hash-qualquer' where id = '${ANA}';`,
      asUser(ANA),
      check("public.viewer_has_password()", "a Ana tem senha"),
      asUser(BIA),
      check("not public.viewer_has_password()", "a Bia (link mágico) não tem"),
      asAnon(),
      rejects(
        "perform public.viewer_has_password();",
        "visitante não pergunta",
      ),
    ),
  );
});
