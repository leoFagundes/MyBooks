"use client";

import {
  estanteItem,
  NavLinks,
  type NavViewer,
  useNavIndicator,
} from "./nav-links";

/** "Minha estante": vai para o perfil de quem está vendo, ou para o Entrar. */
export function EstanteLink({
  viewer,
  variant,
}: {
  viewer: NavViewer | null;
  variant: "top" | "pill";
}) {
  return (
    <NavLinks
      items={[estanteItem(viewer)]}
      indicatorId={useNavIndicator()}
      variant={variant}
    />
  );
}
