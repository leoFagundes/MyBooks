import type { Route } from "next";

// URLs do app num lugar só. Com typedRoutes, só as páginas que já existem
// são rotas válidas: as que chegam nas próximas fases levam `as Route`. O
// perfil sempre leva (/@usuario é um rewrite para app/(app)/u/[username]), e
// as dinâmicas também, porque o typedRoutes não aceita uma string qualquer
// como segmento.
export const routes = {
  home: "/" as const satisfies Route,
  dev: "/dev" as const satisfies Route,
  inicio: "/inicio" as const satisfies Route,
  explorar: "/explorar" as const satisfies Route,
  entrar: "/entrar" as const satisfies Route,
  cadastro: "/cadastro" as const satisfies Route,
  onboarding: "/onboarding" as const satisfies Route,
  configuracoes: "/configuracoes" as const satisfies Route,
  admin: "/admin" as const satisfies Route,
  adminUsuarios: "/admin/usuarios" as const satisfies Route,
  adminModeracao: "/admin/moderacao" as const satisfies Route,
  adminLivros: "/admin/livros" as const satisfies Route,
  adminConfiguracoes: "/admin/configuracoes" as const satisfies Route,
  adminAuditoria: "/admin/auditoria" as const satisfies Route,
  profile: (username: string) => `/@${username}` as Route,
  profileTab: (username: string, tab: "colecoes" | "citacoes") =>
    `/@${username}/${tab}` as Route,
  book: (id: string) => `/livro/${id}` as Route,
  collection: (id: string) => `/colecao/${id}` as Route,
};
