/**
 * As três vistas da estante (spec §5). O banco espelha a lista no check
 * profile_preferences_shelf_view.
 */
export const SHELF_VIEWS = ["estante", "grade", "lista"] as const;

export type ShelfView = (typeof SHELF_VIEWS)[number];

export const DEFAULT_SHELF_VIEW: ShelfView = "estante";

/**
 * O cookie com a vista escolhida: o servidor o lê, e a estante já nasce na
 * vista certa, sem trocar depois. Ao entrar na conta, o valor do perfil o
 * reescreve.
 */
export const SHELF_VIEW_COOKIE = "mybooks-vista";

export const SHELF_VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function shelfViewOf(
  value: string | null | undefined,
): ShelfView | null {
  return SHELF_VIEWS.find((view) => view === value) ?? null;
}
