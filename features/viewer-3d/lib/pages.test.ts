import { describe, expect, test } from "vitest";
import type { CommunityQuote } from "@/features/books/queries";
import { type BookCopy, EMPTY_COPY, quoteKey } from "./copy";
import { MAX_LEAVES, pageLayout } from "./pages";

const reader = (username: string) => ({
  username,
  displayName: username,
  avatarUrl: null,
});
const community = (text: string, username: string): CommunityQuote => ({
  text,
  page: null,
  reader: reader(username),
});

const mine: NonNullable<BookCopy["mine"]> = {
  displayName: "Clara",
  status: "reading",
  currentPage: 120,
  rating: null,
  review: null,
  addedAt: "2026-10-01T00:00:00Z",
  copiedFrom: null,
  quotes: [
    { text: "Uma marcação minha", page: 12 },
    { text: "Outra marcação minha", page: 87 },
  ],
};

describe("o exemplar no 3D", () => {
  test("o mesmo trecho com aspas e acentos diferentes é um só", () => {
    expect(quoteKey("“Árvore, de novo!”")).toBe(quoteKey("arvore de novo"));
  });

  test("folha de rosto, marcador, as minhas a lápis, a comunidade e o fórum", () => {
    const layout = pageLayout(
      [
        community("Uma marcação minha", "clara"),
        community("Um trecho da Ana", "ana"),
        community("Um trecho da Bia", "bia"),
      ],
      {
        ...EMPTY_COPY,
        mine,
        savedBy: { [quoteKey("Uma marcação minha")]: ["ana"] },
        discussions: [{ id: "t1", title: "Um tópico", replies: 2 }],
      },
      268,
    );
    // A minha não vai para o pé da folha de rosto: ela fica com a da Ana
    expect(layout.titleQuote?.reader.username).toBe("ana");
    expect(layout.faces.map((face) => face.kind)).toEqual([
      "title",
      "bookmark",
      "quote",
      "quote",
      "quote",
      "discussions",
    ]);
    const [, bookmark, first, , other] = layout.faces;
    expect(bookmark).toEqual({ kind: "bookmark", page: 120, total: 268 });
    expect(first).toMatchObject({ credit: null, alsoMarked: ["ana"] });
    expect(other).toMatchObject({ credit: "bia", text: "Um trecho da Bia" });
    expect(layout.leafCount).toBe(3);
  });

  test("a primeira frase só vem em domínio público; senão, a mais guardada", () => {
    const pd = pageLayout(
      [],
      {
        ...EMPTY_COPY,
        reading: {
          url: "https://archive.org/details/x",
          firstSentence: "Era uma vez.",
        },
      },
      null,
    );
    expect(pd.faces[1]).toMatchObject({
      kind: "excerpt",
      label: "A PRIMEIRA FRASE",
    });

    const saved = pageLayout(
      [],
      {
        ...EMPTY_COPY,
        mostSaved: { text: "Um trecho querido", page: 3, count: 4 },
      },
      null,
    );
    expect(saved.faces[1]).toMatchObject({
      kind: "excerpt",
      label: "A MAIS GUARDADA",
    });
  });

  test("sem nada além da folha de rosto, não há folha para virar", () => {
    expect(
      pageLayout([community("Só um", "ana")], EMPTY_COPY, null),
    ).toMatchObject({
      leafCount: 0,
      faces: [],
    });
  });

  test("nunca passa das folhas que cabem", () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      community(`Trecho ${index}`, `leitor${index}`),
    );
    const layout = pageLayout(
      many,
      {
        ...EMPTY_COPY,
        mine: {
          ...mine,
          quotes: Array.from({ length: 8 }, (_, index) => ({
            text: `Minha ${index}`,
            page: index,
          })),
        },
        discussions: [{ id: "t1", title: "Um tópico", replies: 0 }],
      },
      null,
    );
    expect(layout.leafCount).toBeLessThanOrEqual(MAX_LEAVES);
    // Faltando lugar, saem as citações da comunidade, não o fórum
    expect(layout.faces.some((face) => face.kind === "discussions")).toBe(true);
  });
});
