import type { Route } from "next";

// URLs do app num lugar só. Com typedRoutes, só as páginas que já existem
// são rotas válidas: as que chegam nas próximas fases levam `as Route` e o
// perfil sempre leva, porque /@usuario é um rewrite para app/(app)/u/[username].
export const routes = {
  home: "/" as const satisfies Route,
  dev: "/dev" as const satisfies Route,
  inicio: "/inicio" as Route,
  explorar: "/explorar" as Route,
  entrar: "/entrar" as Route,
  cadastro: "/cadastro" as Route,
  onboarding: "/onboarding" as Route,
  configuracoes: "/configuracoes" as Route,
  profile: (username: string) => `/@${username}` as Route,
  profileTab: (username: string, tab: "colecoes" | "citacoes") =>
    `/@${username}/${tab}` as Route,
  book: (id: string) => `/livro/${id}` as Route,
  collection: (id: string) => `/colecao/${id}` as Route,
};
