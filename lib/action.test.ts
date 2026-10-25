import { describe, expect, test } from "vitest";
import { z } from "zod";
import { fieldErrorsFrom } from "./action";

const schema = z.object({
  email: z.email("Confira o e-mail").max(5, "E-mail longo demais"),
  password: z.string().min(8, "A senha precisa de 8 caracteres"),
  profile: z.object({ username: z.string().min(3, "Mínimo de 3 letras") }),
});

describe("fieldErrorsFrom", () => {
  test("fica com a primeira mensagem de cada campo, pelo caminho", () => {
    const result = schema.safeParse({
      email: "nao-e-email",
      password: "123",
      profile: { username: "a" },
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrorsFrom(result.error)).toEqual({
      email: "Confira o e-mail",
      password: "A senha precisa de 8 caracteres",
      "profile.username": "Mínimo de 3 letras",
    });
  });
});
