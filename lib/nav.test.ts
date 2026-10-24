import { describe, expect, test } from "vitest";
import { isActivePath } from "./nav";

describe("isActivePath", () => {
  test("a própria rota está ativa", () => {
    expect(isActivePath("/explorar", "/explorar")).toBe(true);
  });

  test("sub-rotas também ativam o link", () => {
    expect(isActivePath("/@ana/colecoes", "/@ana")).toBe(true);
  });

  test("prefixo sem barra não conta", () => {
    expect(isActivePath("/explorarmais", "/explorar")).toBe(false);
  });

  test("a raiz só ativa na raiz", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/dev", "/")).toBe(false);
  });

  test("sem pathname (ainda carregando) nada fica ativo", () => {
    expect(isActivePath(null, "/explorar")).toBe(false);
  });
});
