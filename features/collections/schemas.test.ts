import { describe, expect, test } from "vitest";
import {
  COLLECTION_LIMITS,
  collectionFormSchema,
  isSingleEmoji,
  itemNoteSchema,
  positionSchema,
} from "./schemas";

const valid = {
  title: "Clássicos brasileiros",
  description: "",
  emoji: "📚",
  visibility: "public",
  isCollaborative: false,
};

const firstMessage = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

describe("collectionFormSchema", () => {
  test("o título chega aparado", () => {
    expect(
      collectionFormSchema.parse({ ...valid, title: "  Clássicos  " }).title,
    ).toBe("Clássicos");
  });

  test("título só com espaços pede um título", () => {
    const result = collectionFormSchema.safeParse({ ...valid, title: "   " });
    expect(firstMessage(result)).toBe("Dê um título à coleção");
  });

  test("título de 81 caracteres não cabe", () => {
    const result = collectionFormSchema.safeParse({
      ...valid,
      title: "a".repeat(COLLECTION_LIMITS.title + 1),
    });
    expect(firstMessage(result)).toBe("Até 80 caracteres");
  });

  test("descrição vazia vira null; com 301 caracteres não cabe", () => {
    expect(collectionFormSchema.parse(valid).description).toBeNull();
    const result = collectionFormSchema.safeParse({
      ...valid,
      description: "a".repeat(COLLECTION_LIMITS.description + 1),
    });
    expect(firstMessage(result)).toBe("Até 300 caracteres");
  });

  test("sem emoji vira null; dois emojis pedem um só", () => {
    expect(
      collectionFormSchema.parse({ ...valid, emoji: " " }).emoji,
    ).toBeNull();
    const result = collectionFormSchema.safeParse({ ...valid, emoji: "😀😀" });
    expect(firstMessage(result)).toBe("Um emoji só");
  });

  test("visibilidade é pública ou privada", () => {
    expect(
      collectionFormSchema.safeParse({ ...valid, visibility: "secreta" })
        .success,
    ).toBe(false);
  });
});

describe("isSingleEmoji", () => {
  test.each(["📚", "👩‍👩‍👧", "🇧🇷", "👍🏽", "❤️", "☕"])(
    "%s é um emoji só",
    (emoji) => {
      expect(isSingleEmoji(emoji)).toBe(true);
    },
  );

  test.each(["😀😀", "a", "1", "", "📚 ", "🇧"])(
    "%j não é um emoji só",
    (text) => {
      expect(isSingleEmoji(text)).toBe(false);
    },
  );
});

describe("itemNoteSchema", () => {
  test("nota aparada; vazia vira null", () => {
    expect(itemNoteSchema.parse("  releitura de férias ")).toBe(
      "releitura de férias",
    );
    expect(itemNoteSchema.parse("   ")).toBeNull();
  });

  test("201 caracteres não cabem", () => {
    const result = itemNoteSchema.safeParse(
      "a".repeat(COLLECTION_LIMITS.note + 1),
    );
    expect(firstMessage(result)).toBe("Até 200 caracteres");
  });
});

describe("positionSchema", () => {
  test("aceita a chave do índice fracionário e recusa o resto", () => {
    expect(positionSchema.safeParse("a0").success).toBe(true);
    expect(positionSchema.safeParse("a 0").success).toBe(false);
    expect(positionSchema.safeParse("").success).toBe(false);
  });
});
