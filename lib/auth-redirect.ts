// Para onde mandar cada pessoa, sem depender do banco: o proxy decide com
// isto, e os retornos do login validam o `next` com safeNextPath.

const PROTECTED = ["/inicio", "/onboarding", "/configuracoes"];
const SIGN_IN_PAGES = ["/", "/entrar", "/cadastro"];

const base = "https://mybooks.invalid";

function matches(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

/**
 * Só aceita caminho do próprio site. O URL do navegador é quem interpreta:
 * `//x`, `/\x` e tabs viram outro domínio, e aí cai no padrão.
 */
export function safeNextPath(
  raw: string | null | undefined,
  fallback: string,
): string {
  if (!raw || !raw.startsWith("/")) return fallback;
  try {
    const url = new URL(raw, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/** Redirecionamento do proxy para um caminho (com busca), ou null para seguir. */
export function authRedirect(path: string, signedIn: boolean): string | null {
  const pathname = new URL(path, base).pathname;
  if (!signedIn && PROTECTED.some((route) => matches(pathname, route))) {
    return `/entrar?next=${encodeURIComponent(path)}`;
  }
  if (signedIn && SIGN_IN_PAGES.includes(pathname)) return "/inicio";
  return null;
}
