import { expect, test } from "vitest";
import { RESERVED_USERNAMES } from "@/features/profile/lib/username";
import { runSql } from "./sql";

test("o app e o banco reservam os mesmos @", async () => {
  const [row] = (await runSql(
    "select private.reserved_usernames() as names",
  )) as { names: string[] }[];
  expect([...(row?.names ?? [])].sort()).toEqual(
    [...RESERVED_USERNAMES].sort(),
  );
});
