import {
  SHELF_VIEW_COOKIE,
  SHELF_VIEW_COOKIE_MAX_AGE,
  type ShelfView,
} from "./view";

// A vista escolhida nesta visita. O roteador guarda a página da estante por
// 5 minutos (unstable_dynamicStaleTime), com a vista que o servidor leu do
// cookie naquela hora: voltando a ela, vale a escolha mais nova.
let remembered: ShelfView | null = null;

/** Guarda a vista no cookie (o servidor lê) e na memória da visita. */
export function rememberShelfView(view: ShelfView) {
  remembered = view;
  document.cookie = `${SHELF_VIEW_COOKIE}=${view}; path=/; max-age=${SHELF_VIEW_COOKIE_MAX_AGE}; samesite=lax`;
}

/** A vista escolhida nesta visita, se houve troca. */
export function rememberedShelfView() {
  return remembered;
}
