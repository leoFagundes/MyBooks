import { describe, expect, test } from "vitest";
import {
  bookIdsIn,
  mentionsIn,
  parseInline,
  parseMarkdown,
  plainText,
} from "./markdown";

const BOOK = "3d4f4713-d94b-593f-b462-10acf3328e40";

describe("markdown leve", () => {
  test("negrito, itálico, spoiler e menção", () => {
    expect(
      parseInline("**forte** e *leve* com ||segredo|| para @Ana_1"),
    ).toEqual([
      { t: "strong", c: [{ t: "text", v: "forte" }] },
      { t: "text", v: " e " },
      { t: "em", c: [{ t: "text", v: "leve" }] },
      { t: "text", v: " com " },
      { t: "spoiler", c: [{ t: "text", v: "segredo" }] },
      { t: "text", v: " para " },
      { t: "mention", username: "ana_1" },
    ]);
  });

  test("link só com http ou https; o resto fica texto", () => {
    expect(parseInline("[site](https://exemplo.com/a)")).toEqual([
      {
        t: "link",
        href: "https://exemplo.com/a",
        c: [{ t: "text", v: "site" }],
      },
    ]);
    expect(parseInline("[x](javascript:alert(1))")).toEqual([
      { t: "text", v: "[x](javascript:alert(1))" },
    ]);
    expect(parseInline('<img src=x onerror="alert(1)">')).toEqual([
      { t: "text", v: '<img src=x onerror="alert(1)">' },
    ]);
  });

  test("endereço solto vira link, sem levar a pontuação do fim", () => {
    expect(parseInline("veja https://exemplo.com.")).toEqual([
      { t: "text", v: "veja " },
      {
        t: "link",
        href: "https://exemplo.com/",
        c: [{ t: "text", v: "https://exemplo.com" }],
      },
      { t: "text", v: "." },
    ]);
  });

  test("e-mail não vira menção, e o livro vira um card", () => {
    expect(parseInline("ana@exemplo.com")).toEqual([
      { t: "text", v: "ana@exemplo.com" },
    ]);
    expect(parseInline(`[[livro:${BOOK}]]`)).toEqual([{ t: "book", id: BOOK }]);
  });

  test("citações, listas e parágrafos com quebra de linha", () => {
    expect(
      parseMarkdown(
        "> citado\n> junto\n\n- um\n- dois\n\n1. a\n2. b\n\nlinha\noutra",
      ),
    ).toEqual([
      {
        t: "quote",
        c: [
          {
            t: "p",
            c: [
              { t: "text", v: "citado" },
              { t: "br" },
              { t: "text", v: "junto" },
            ],
          },
        ],
      },
      {
        t: "ul",
        items: [[{ t: "text", v: "um" }], [{ t: "text", v: "dois" }]],
      },
      { t: "ol", items: [[{ t: "text", v: "a" }], [{ t: "text", v: "b" }]] },
      {
        t: "p",
        c: [{ t: "text", v: "linha" }, { t: "br" }, { t: "text", v: "outra" }],
      },
    ]);
  });

  test("os livros, as menções e o texto puro", () => {
    expect(bookIdsIn(`a [[livro:${BOOK}]] b [[livro:${BOOK}]]`)).toEqual([
      BOOK,
    ]);
    expect(mentionsIn("@Bia e @bia, mas não a@b.com")).toEqual(["bia"]);
    expect(plainText("**Oi** ||fim|| [aqui](https://x.com)")).toBe(
      "Oi (spoiler) aqui",
    );
  });
});
