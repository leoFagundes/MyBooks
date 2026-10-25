"use client";

import { Compass, House, Library } from "lucide-react";
import { usePathname } from "next/navigation";
import { createContext, Suspense, use } from "react";
import { isActivePath } from "@/lib/nav";
import { routes } from "@/lib/routes";
import { NavLink, type NavItem } from "./nav-link";

export type NavViewer = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export function estanteItem(viewer: NavViewer | null): NavItem {
  return {
    href: viewer ? routes.profile(viewer.username) : routes.entrar,
    label: "Minha estante",
    icon: Library,
  };
}

export function mainNavItems(viewer: NavViewer | null): NavItem[] {
  return [
    { href: routes.inicio, label: "Início", icon: House },
    { href: routes.explorar, label: "Explorar", icon: Compass },
    estanteItem(viewer),
  ];
}

/**
 * O id do indicador da barra: o link que chega depois, num slot com Suspense
 * ("Minha estante"), desliza junto com os outros.
 */
export const NavIndicatorContext = createContext("");

export const useNavIndicator = () => use(NavIndicatorContext);

type NavLinksProps = {
  items: NavItem[];
  indicatorId: string;
  variant: "top" | "pill";
};

function Links({
  pathname,
  ...props
}: NavLinksProps & { pathname: string | null }) {
  return props.items.map((item) => (
    <NavLink
      key={item.href}
      item={item}
      active={isActivePath(pathname, item.href)}
      indicatorId={props.indicatorId}
      variant={props.variant}
    />
  ));
}

function ActiveLinks(props: NavLinksProps) {
  return <Links {...props} pathname={usePathname()} />;
}

/**
 * Com Cache Components, usePathname suspende em rotas com parâmetro
 * desconhecido no build: o fallback mostra os mesmos links sem destaque.
 */
export function NavLinks(props: NavLinksProps) {
  return (
    <Suspense fallback={<Links {...props} pathname={null} />}>
      <ActiveLinks {...props} />
    </Suspense>
  );
}
