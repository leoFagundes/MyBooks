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
const LIA_2 = "00000000-0000-4000-8000-000000000002";
const BENTO = "00000000-0000-4000-8000-000000000003";

const field = (id: string, column: string) =>
  `(select ${column} from public.profiles where id = '${id}')`;
const validUsername = (id: string) =>
  `${field(id, "username")} ~ '^[a-z0-9_]{3,20}$'`;

describe("cadastro", () => {
  test("o perfil nasce com o @ tirado do e-mail", async () => {
    await runSql(
      sqlTransaction(
        createUser({ id: LIA, email: "lia.prado@x.com" }),
        check(
          `${field(LIA, "username")} = 'lia_prado'`,
          "lia.prado → lia_prado",
        ),
        check(`${field(LIA, "onboarded_at")} is null`, "onboarding pendente"),
      ),
    );
  });

  test("dois cadastros com o mesmo nome ganham sufixo", async () => {
    await runSql(
      sqlTransaction(
        createUser({ id: LIA, email: "lia.prado@x.com" }),
        createUser({ id: LIA_2, email: "lia.prado@y.com" }),
        check(`${field(LIA_2, "username")} = 'lia_prado1'`, "sufixo 1"),
      ),
    );
  });

  test("o Google preenche nome e avatar, e dois iguais não colidem", async () => {
    await runSql(
      sqlTransaction(
        createUser({
          id: LIA,
          email: "l@gmail.com",
          meta: {
            full_name: "Lia Prado",
            avatar_url: "https://lh3.googleusercontent.com/a/lia=s96-c",
          },
        }),
        createUser({
          id: LIA_2,
          email: "outra@gmail.com",
          meta: {
            name: "Lía Prado",
            picture: "https://lh3.googleusercontent.com/a/lia2=s96-c",
          },
        }),
        check(`${field(LIA, "username")} = 'lia_prado'`, "@ do nome"),
        check(`${field(LIA, "display_name")} = 'Lia Prado'`, "nome do Google"),
        check(
          `${field(LIA, "avatar_url")} = 'https://lh3.googleusercontent.com/a/lia=s96-c'`,
          "avatar do Google",
        ),
        check(
          `${field(LIA_2, "username")} = 'lia_prado1'`,
          "sem acento e com sufixo",
        ),
        check(
          `${field(LIA_2, "display_name")} = 'Lía Prado'`,
          "name também vale",
        ),
        check(
          `${field(LIA_2, "avatar_url")} like 'https://lh3.%'`,
          "picture também vale",
        ),
      ),
    );
  });

  test("o @ escolhido no cadastro vence o e-mail", async () => {
    await runSql(
      sqlTransaction(
        createUser({
          id: LIA,
          email: "x@x.com",
          meta: { username: " @Lia_Lê " },
        }),
        check(`${field(LIA, "username")} = 'lia_le'`, "normalizado"),
      ),
    );
  });

  test("avatar de fora do Google não entra, e o cadastro não falha", async () => {
    await runSql(
      sqlTransaction(
        createUser({
          id: LIA,
          email: "lia@x.com",
          meta: { avatar_url: "https://avatars.githubusercontent.com/u/1" },
        }),
        check(`${field(LIA, "avatar_url")} is null`, "avatar descartado"),
      ),
    );
  });

  test("e-mail curto, longo ou reservado vira um @ válido", async () => {
    await runSql(
      sqlTransaction(
        createUser({ id: LIA, email: "ab@x.com" }),
        createUser({
          id: LIA_2,
          email: "maria.clara.dos.anjos.bittencourt@x.com",
        }),
        createUser({ id: BENTO, email: "admin@x.com" }),
        check(validUsername(LIA), "curto completado"),
        check(`${field(LIA, "username")} like 'ab%'`, "começa pelo e-mail"),
        check(validUsername(LIA_2), "longo cortado em 20"),
        check(validUsername(BENTO), "reservado com formato válido"),
        check(`${field(BENTO, "username")} <> 'admin'`, "admin é reservado"),
      ),
    );
  });
});

describe("acesso aos perfis", () => {
  test("visitante lê perfis, inclusive os privados", async () => {
    await runSql(
      sqlTransaction(
        createUser({ id: LIA, email: "lia@x.com" }),
        createUser({ id: BENTO, email: "bento@x.com" }),
        `update public.profiles set is_private = true where id = '${BENTO}';`,
        asAnon(),
        check(
          `(select count(*) from public.profiles where id in ('${LIA}', '${BENTO}')) = 2`,
          "os dois cabeçalhos são públicos",
        ),
      ),
    );
  });

  test("cada um edita só o próprio perfil, e só os campos de perfil", async () => {
    await runSql(
      sqlTransaction(
        createUser({ id: LIA, email: "lia@x.com" }),
        createUser({ id: BENTO, email: "bento@x.com" }),
        asUser(LIA),
        `update public.profiles set bio = 'Leio no ônibus.' where id = '${LIA}';`,
        `update public.profiles set bio = 'invadido' where id = '${BENTO}';`,
        rejects(
          `update public.profiles set created_at = '2000-01-01' where id = '${LIA}';`,
          "mudar o created_at",
        ),
        asAdmin(),
        check(`${field(LIA, "bio")} = 'Leio no ônibus.'`, "editou o próprio"),
        check(`${field(BENTO, "bio")} is null`, "não editou o alheio"),
      ),
    );
  });

  test("ninguém cria nem apaga perfil pela API", async () => {
    await runSql(
      sqlTransaction(
        createUser({ id: LIA, email: "lia@x.com" }),
        asUser(LIA),
        rejects(
          `insert into public.profiles (id, username) values ('${BENTO}', 'bento');`,
          "criar perfil",
        ),
        rejects(
          `delete from public.profiles where id = '${LIA}';`,
          "apagar o próprio perfil",
        ),
        asAnon(),
        rejects(
          `update public.profiles set bio = 'x' where id = '${LIA}';`,
          "visitante editar",
        ),
        asAdmin(),
        check(`${field(LIA, "bio")} is null`, "o perfil segue intacto"),
      ),
    );
  });

  test("avatar só da pasta da pessoa no nosso bucket ou do Google", async () => {
    await runSql(
      sqlTransaction(
        createUser({ id: LIA, email: "lia@x.com" }),
        asUser(LIA),
        `update public.profiles set avatar_url = 'avatars/${LIA}/1730000000.webp' where id = '${LIA}';`,
        `update public.profiles set avatar_url = 'https://lh3.googleusercontent.com/a/lia=s96-c' where id = '${LIA}';`,
        rejects(
          `update public.profiles set avatar_url = 'https://exemplo.com/lia.png' where id = '${LIA}';`,
          "avatar de outro domínio",
        ),
        rejects(
          `update public.profiles set avatar_url = 'avatars/${BENTO}/x.webp' where id = '${LIA}';`,
          "avatar na pasta de outra pessoa",
        ),
      ),
    );
  });

  test("o @ segue o formato e foge dos nomes reservados", async () => {
    await runSql(
      sqlTransaction(
        createUser({ id: LIA, email: "lia@x.com" }),
        asUser(LIA),
        rejects(
          `update public.profiles set username = 'Lia' where id = '${LIA}';`,
          "maiúscula",
        ),
        rejects(
          `update public.profiles set username = 'li' where id = '${LIA}';`,
          "curto",
        ),
        rejects(
          `update public.profiles set username = 'lia-prado' where id = '${LIA}';`,
          "hífen",
        ),
        rejects(
          `update public.profiles set username = 'admin' where id = '${LIA}';`,
          "reservado",
        ),
        `update public.profiles set username = 'lia_le' where id = '${LIA}';`,
        asAdmin(),
        check(`${field(LIA, "username")} = 'lia_le'`, "o @ válido entrou"),
      ),
    );
  });

  test("nome e bio têm limite", async () => {
    await runSql(
      sqlTransaction(
        createUser({ id: LIA, email: "lia@x.com" }),
        asUser(LIA),
        rejects(
          `update public.profiles set display_name = repeat('a', 61) where id = '${LIA}';`,
          "nome com 61",
        ),
        rejects(
          `update public.profiles set bio = repeat('a', 161) where id = '${LIA}';`,
          "bio com 161",
        ),
        rejects(
          `update public.profiles set display_name = '   ' where id = '${LIA}';`,
          "nome em branco",
        ),
        `update public.profiles set display_name = repeat('a', 60), bio = repeat('b', 160) where id = '${LIA}';`,
        asAdmin(),
        check(
          `${field(LIA, "char_length(display_name) + char_length(bio)")} = 220`,
          "no limite, entra",
        ),
      ),
    );
  });

  test("updated_at acompanha cada edição", async () => {
    await runSql(
      sqlTransaction(
        createUser({ id: LIA, email: "lia@x.com" }),
        `update public.profiles set updated_at = '2000-01-01' where id = '${LIA}';`,
        check(
          `${field(LIA, "updated_at")} = now()`,
          "o trigger põe a hora da edição",
        ),
      ),
    );
  });
});
