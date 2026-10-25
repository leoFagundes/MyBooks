import { describe, expect, test } from "vitest";
import { authRedirect, safeNextPath } from "./auth-redirect";

describe("safeNextPath", () => {
  test.each([
    ["https://mal.com", "outro domínio"],
    ["//mal.com", "protocolo implícito"],
    ["/\\mal.com", "barra invertida que o navegador lê como //"],
    ["/\t/mal.com", "tab que o navegador remove"],
    ["javascript:alert(1)", "esquema javascript"],
    ["inicio", "caminho sem barra"],
    ["", "vazio"],
  ])("recusa %j (%s) e usa o padrão", (raw) => {
    expect(safeNextPath(raw, "/inicio")).toBe("/inicio");
  });

  test("sem valor, usa o padrão", () => {
    expect(safeNextPath(null, "/inicio")).toBe("/inicio");
    expect(safeNextPath(undefined, "/onboarding")).toBe("/onboarding");
  });

  test("aceita caminho do próprio site com busca e âncora", () => {
    expect(safeNextPath("/@ana/colecoes?x=1", "/inicio")).toBe(
      "/@ana/colecoes?x=1",
    );
    expect(safeNextPath("/livro/42#citacoes", "/inicio")).toBe(
      "/livro/42#citacoes",
    );
  });
});

describe("authRedirect", () => {
  test("sem conta, as rotas da conta levam ao /entrar com a volta", () => {
    expect(authRedirect("/inicio", false)).toBe("/entrar?next=%2Finicio");
    expect(authRedirect("/onboarding", false)).toBe(
      "/entrar?next=%2Fonboarding",
    );
    expect(authRedirect("/configuracoes/conta?aba=1", false)).toBe(
      "/entrar?next=%2Fconfiguracoes%2Fconta%3Faba%3D1",
    );
  });

  test("com conta, a landing e as telas de entrar levam ao /inicio", () => {
    expect(authRedirect("/", true)).toBe("/inicio");
    expect(authRedirect("/entrar", true)).toBe("/inicio");
    expect(authRedirect("/cadastro?x=1", true)).toBe("/inicio");
  });

  test("não cria laço nem mexe no que é público", () => {
    expect(authRedirect("/entrar", false)).toBeNull();
    expect(authRedirect("/inicio", true)).toBeNull();
    expect(authRedirect("/", false)).toBeNull();
    expect(authRedirect("/@ana", false)).toBeNull();
    expect(authRedirect("/inicioso", false)).toBeNull();
  });
});
