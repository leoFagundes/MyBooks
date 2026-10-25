import { sampleBooks } from "@/features/books/sample-books";
import type { BookVisual } from "@/features/books/types";
import type { CollectionVisual, Person } from "./types";

// Coleções de exemplo para a vitrine, com os livros de sample-books.ts
function book(id: string): BookVisual {
  const found = sampleBooks.find((sample) => sample.id === id);
  if (!found) throw new Error(`Livro de exemplo inexistente: ${id}`);
  return found;
}

const ana: Person = {
  username: "ana",
  displayName: "Ana Souza",
  avatarUrl: null,
};
const bia: Person = {
  username: "bia",
  displayName: "Bia Lima",
  avatarUrl: null,
};

const classics = [
  "dom-casmurro",
  "memorias-postumas-de-bras-cubas",
  "grande-sertao-veredas",
  "vidas-secas",
  "a-hora-da-estrela",
  "quarto-de-despejo",
  "torto-arado",
  "a-paixao-segundo-gh",
];
const dystopias = ["1984", "ensaio-sobre-a-cegueira", "duna"];

export const sampleCollections: CollectionVisual[] = [
  {
    id: "classicos-brasileiros",
    title: "Clássicos brasileiros",
    emoji: "📚",
    description:
      "Os livros que explicam o Brasil, de Machado a Carolina Maria de Jesus.",
    visibility: "public",
    isCollaborative: true,
    owner: ana,
    members: [bia],
    copiedFrom: null,
    bookCount: classics.length,
    likeCount: 34,
    covers: classics.slice(0, 5).map(book),
  },
  {
    id: "futuros-que-dao-medo",
    title: "Futuros que dão medo",
    emoji: "🌒",
    description: "Distopias para ler com a luz acesa.",
    visibility: "public",
    isCollaborative: false,
    owner: bia,
    members: [],
    copiedFrom: {
      username: "caio",
      collection: { id: "distopias", title: "Distopias" },
    },
    bookCount: dystopias.length,
    likeCount: 12,
    covers: dystopias.map(book),
  },
  {
    id: "para-ler-devagar",
    title: "Para ler devagar",
    emoji: "🍵",
    description: null,
    visibility: "private",
    isCollaborative: false,
    owner: ana,
    members: [],
    copiedFrom: null,
    bookCount: 0,
    likeCount: 0,
    covers: [],
  },
];
