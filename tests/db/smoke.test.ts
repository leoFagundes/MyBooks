import { describe, expect, test } from "vitest";
import { check, runSql, sqlTransaction } from "./sql";

describe("ponte com o banco", () => {
  test("roda SQL e devolve as linhas", async () => {
    await expect(runSql("select 1 as ok")).resolves.toEqual([{ ok: 1 }]);
  });

  test("um assert falso derruba a transação com a mensagem dele", async () => {
    await expect(
      runSql(sqlTransaction(check("1 = 2", "falhou de propósito"))),
    ).rejects.toThrow(/falhou de propósito/);
  });

  test("a transação é desfeita: nada fica no banco", async () => {
    await runSql(
      sqlTransaction(
        "create table public.teste_rollback (id int);",
        "insert into public.teste_rollback values (1);",
      ),
    );
    await expect(
      runSql("select to_regclass('public.teste_rollback') as tabela"),
    ).resolves.toEqual([{ tabela: null }]);
  });
});
