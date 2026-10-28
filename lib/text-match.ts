/** O texto sem acento e sem caixa: "Sertão" e "sertao" ficam iguais. */
export function foldText(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Todas as palavras da busca estão no texto, sem acento e sem caixa: "sertao
 * rosa" acha "Grande Sertão: Veredas, de Guimarães Rosa".
 */
export function matchesText(haystack: string, query: string): boolean {
  const text = foldText(haystack);
  return foldText(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word));
}
