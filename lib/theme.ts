export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "mybooks:tema";
export const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

export function parseThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

export function applyTheme(root: HTMLElement, theme: ResolvedTheme) {
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
}

// Roda no <head>, antes da primeira pintura, como texto: não pode importar nada.
// A lógica repete parseThemePreference/resolveTheme, e lib/theme.test.ts
// confere que as duas versões concordam.
function initTheme(storageKey: string, darkQuery: string) {
  let preference = "system";
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark" || stored === "system")
      preference = stored;
  } catch {}
  const dark =
    preference === "dark" ||
    (preference === "system" &&
      typeof matchMedia === "function" &&
      matchMedia(darkQuery).matches);
  const theme = dark ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}

export const themeInitScript = `(${initTheme.toString()})(${JSON.stringify(
  THEME_STORAGE_KEY,
)},${JSON.stringify(DARK_SCHEME_QUERY)})`;
