import { describe, expect, test } from "vitest";
import { magicLinkSchema, signInSchema, signUpSchema } from "./schemas";

const firstMessage = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

describe("e-mail", () => {
  test("vazio e malformado têm mensagens diferentes", () => {
    expect(firstMessage(magicLinkSchema.safeParse({ email: "" }))).toBe(
      "Digite seu e-mail",
    );
    expect(firstMessage(magicLinkSchema.safeParse({ email: "ana@" }))).toBe(
      "Esse e-mail não parece certo",
    );
  });

  test("espaços e maiúsculas não atrapalham", () => {
    expect(magicLinkSchema.parse({ email: "  Ana@Exemplo.com " })).toEqual({
      email: "ana@exemplo.com",
    });
  });
});

describe("senha", () => {
  test("para criar conta, 8 caracteres ou mais", () => {
    expect(
      firstMessage(
        signUpSchema.safeParse({
          email: "ana@exemplo.com",
          password: "1234567",
        }),
      ),
    ).toBe("A senha precisa de 8 caracteres ou mais");
    expect(
      signUpSchema.safeParse({ email: "ana@exemplo.com", password: "12345678" })
        .success,
    ).toBe(true);
  });

  test("até 72 caracteres, o limite do Supabase", () => {
    expect(
      firstMessage(
        signUpSchema.safeParse({
          email: "ana@exemplo.com",
          password: "a".repeat(73),
        }),
      ),
    ).toBe("Até 72 caracteres");
  });

  test("para entrar, só não pode faltar (contas antigas têm senha curta)", () => {
    expect(
      firstMessage(
        signInSchema.safeParse({ email: "ana@exemplo.com", password: "" }),
      ),
    ).toBe("Digite sua senha");
    expect(
      signInSchema.safeParse({ email: "ana@exemplo.com", password: "123" })
        .success,
    ).toBe(true);
  });
});
