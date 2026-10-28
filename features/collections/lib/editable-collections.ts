/** Coleção em que a pessoa pode pôr livros (as dela e as colaborativas). */
export type EditableCollectionOption = {
  id: string;
  title: string;
  emoji: string | null;
};

export const EDITABLE_COLLECTIONS_KEY = ["colecoes-editaveis"];

/** O campo "Coleção" da paleta e do Copiar; sem resposta, lista vazia. */
export async function fetchEditableCollections(): Promise<
  EditableCollectionOption[]
> {
  const response = await fetch("/api/collections/editable");
  if (!response.ok) return [];
  const body = (await response.json()) as {
    collections?: EditableCollectionOption[];
  };
  return body.collections ?? [];
}
