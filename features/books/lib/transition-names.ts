// Nomes da viagem da capa entre páginas (View Transitions). Precisam ser
// identificadores CSS válidos: ids do catálogo (UUID) e slugs já são; o resto
// vira _código_, inclusive o próprio _, para dois ids nunca darem o mesmo nome.
function cssIdent(id: string): string {
  return id.replace(
    /[^a-z0-9-]/gi,
    (char) => `_${char.codePointAt(0)?.toString(16)}_`,
  );
}

export const coverName = (id: string) => `capa-${cssIdent(id)}`;
export const titleName = (id: string) => `titulo-${cssIdent(id)}`;
/** O livro na troca de vista da estante; `scope` separa duas estantes na tela. */
export const viewName = (scope: string, id: string) =>
  `vista-${cssIdent(scope)}-${cssIdent(id)}`;
