/** Palavras de um título para revelar uma a uma; a pontuação fica colada. */
export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}
