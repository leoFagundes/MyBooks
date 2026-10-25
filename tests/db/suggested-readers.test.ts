import { test } from "vitest";
import {
  asAnon,
  asUser,
  check,
  createUser,
  runSql,
  sqlTransaction,
} from "./sql";

const VIEWER = "00000000-0000-4000-8000-000000000001";
const DOIS = "00000000-0000-4000-8000-000000000002";
const UM = "00000000-0000-4000-8000-000000000003";
const SEGUIDO = "00000000-0000-4000-8000-000000000004";
const NOVATO = "00000000-0000-4000-8000-000000000005";

const reader = (id: string, genres: string, onboarded = true) =>
  `update public.profiles set favorite_genres = '${genres}'${onboarded ? ", onboarded_at = now()" : ""} where id = '${id}';`;
const suggested = "public.suggested_readers(20)";

test("sugere quem divide mais gêneros, sem a própria pessoa, quem ela segue ou quem não terminou o onboarding", async () => {
  await runSql(
    sqlTransaction(
      createUser({ id: VIEWER, email: "viewer@x.com" }),
      createUser({ id: DOIS, email: "dois@x.com" }),
      createUser({ id: UM, email: "um@x.com" }),
      createUser({ id: SEGUIDO, email: "seguido@x.com" }),
      createUser({ id: NOVATO, email: "novato@x.com" }),
      // Nenhum leitor do seed gosta de quadrinhos e terror ao mesmo tempo
      reader(VIEWER, "{quadrinhos,terror}"),
      reader(DOIS, "{terror,quadrinhos,poesia}"),
      reader(UM, "{quadrinhos}"),
      reader(SEGUIDO, "{quadrinhos,terror}"),
      reader(NOVATO, "{quadrinhos,terror}", false),
      `insert into public.follows (follower_id, following_id) values ('${VIEWER}', '${SEGUIDO}');`,
      asUser(VIEWER),
      check(
        `(select id from ${suggested} limit 1) = '${DOIS}'`,
        "quem divide dois gêneros vem primeiro",
      ),
      check(
        `(select common_genres from ${suggested} where id = '${DOIS}') = 2`,
        "conta os gêneros em comum",
      ),
      check(
        `exists (select 1 from ${suggested} where id = '${UM}')`,
        "quem divide um também aparece",
      ),
      check(
        `not exists (select 1 from ${suggested} where id in ('${VIEWER}', '${SEGUIDO}', '${NOVATO}'))`,
        "nem a própria pessoa, nem quem ela segue, nem quem não terminou",
      ),
      check(
        `(select count(*) from public.suggested_readers(3)) = 3`,
        "respeita o limite",
      ),
      asAnon(),
      check(
        `not exists (select 1 from ${suggested})`,
        "visitante não recebe sugestão",
      ),
    ),
  );
});
