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
const LIVRO = "00000000-0000-4000-8000-000000000101";

const upload = (bucket: string, name: string, owner: string) =>
  `insert into storage.objects (bucket_id, name, owner_id) values ('${bucket}', '${name}', '${owner}');`;
const exists = (bucket: string, name: string) =>
  `exists (select 1 from storage.objects where bucket_id = '${bucket}' and name = '${name}')`;
// A API do Storage liga isso ao apagar; SQL direto é barrado por trigger
const asStorageApi = "set local storage.allow_delete_query = 'true';";

describe("avatares", () => {
  test("cada um sobe, troca e apaga só na própria pasta", async () => {
    await runSql(
      sqlTransaction(
        createUser({ id: ANA, email: "ana@x.com" }),
        createUser({ id: BIA, email: "bia@x.com" }),
        asUser(ANA),
        upload("avatars", `${ANA}/1730000000.webp`, ANA),
        rejects(
          upload("avatars", `${BIA}/1730000000.webp`, ANA),
          "subir na pasta da Bia",
        ),
        rejects(
          upload("avatars", `1730000000.webp`, ANA),
          "subir fora de pasta",
        ),
        `update storage.objects set metadata = '{"trocado": true}' where name = '${ANA}/1730000000.webp';`,
        asUser(BIA),
        upload("avatars", `${BIA}/1730000000.webp`, BIA),
        asUser(ANA),
        asStorageApi,
        `delete from storage.objects where bucket_id = 'avatars' and name = '${BIA}/1730000000.webp';`,
        `update storage.objects set name = '${ANA}/roubado.webp' where name = '${BIA}/1730000000.webp';`,
        rejects(
          `update storage.objects set name = '${BIA}/meu.webp' where name = '${ANA}/1730000000.webp';`,
          "mover o próprio para a pasta da Bia",
        ),
        asAdmin(),
        check(exists("avatars", `${BIA}/1730000000.webp`), "o da Bia ficou"),
        check(
          `(select metadata ->> 'trocado' from storage.objects where name = '${ANA}/1730000000.webp') = 'true'`,
          "a Ana trocou o dela",
        ),
        asUser(ANA),
        asStorageApi,
        `delete from storage.objects where name = '${ANA}/1730000000.webp';`,
        asAdmin(),
        check(
          `not ${exists("avatars", `${ANA}/1730000000.webp`)}`,
          "a Ana apagou o dela",
        ),
      ),
    );
  });

  test("visitante não sobe nada", async () => {
    await runSql(
      sqlTransaction(
        createUser({ id: ANA, email: "ana@x.com" }),
        asAnon(),
        rejects(
          upload("avatars", `${ANA}/1.webp`, ANA),
          "visitante subir avatar",
        ),
        rejects(
          upload("covers", `${LIVRO}/333.webp`, ANA),
          "visitante subir capa",
        ),
        // Controle: logada, a mesma pessoa sobe
        asUser(ANA),
        upload("avatars", `${ANA}/1.webp`, ANA),
      ),
    );
  });
});

describe("capas", () => {
  test("só o servidor grava capas, na pasta do livro", async () => {
    await runSql(
      sqlTransaction(
        createUser({ id: ANA, email: "ana@x.com" }),
        asUser(ANA),
        rejects(
          upload("covers", `${LIVRO}/333.webp`, ANA),
          "subir capa logada",
        ),
        rejects(
          upload("covers", `${ANA}/333.webp`, ANA),
          "subir capa na própria pasta",
        ),
        "set local role service_role;",
        upload("covers", `${LIVRO}/333.webp`, ANA),
        asAdmin(),
        check(exists("covers", `${LIVRO}/333.webp`), "o servidor gravou"),
      ),
    );
  });
});

describe("buckets", () => {
  test("públicos, com limite de tamanho e só imagens", async () => {
    await runSql(
      sqlTransaction(
        check(
          `(select public and file_size_limit = 2097152 and allowed_mime_types = '{image/webp,image/jpeg,image/png}' from storage.buckets where id = 'avatars')`,
          "avatars: público, 2 MB, imagens",
        ),
        check(
          `(select public and file_size_limit = 5242880 and allowed_mime_types = '{image/webp,image/jpeg,image/png}' from storage.buckets where id = 'covers')`,
          "covers: público, 5 MB, imagens",
        ),
      ),
    );
  });
});
