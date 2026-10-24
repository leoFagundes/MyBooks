import { describe, expect, test } from "vitest";
import { routes } from "./routes";

describe("routes", () => {
  test("o perfil mora em /@usuario", () => {
    expect(routes.profile("ana_l")).toBe("/@ana_l");
  });

  test("as abas do perfil são sub-rotas", () => {
    expect(routes.profileTab("ana", "colecoes")).toBe("/@ana/colecoes");
    expect(routes.profileTab("ana", "citacoes")).toBe("/@ana/citacoes");
  });

  test("livro e coleção usam o id", () => {
    expect(routes.book("abc")).toBe("/livro/abc");
    expect(routes.collection("x")).toBe("/colecao/x");
  });

  test("páginas fixas", () => {
    expect(routes.home).toBe("/");
    expect(routes.inicio).toBe("/inicio");
    expect(routes.explorar).toBe("/explorar");
    expect(routes.entrar).toBe("/entrar");
  });
});
