import { describe, expect, test } from "vitest";
import { cn } from "./utils";

describe("cn conhece os tokens do MyBooks", () => {
  test("raios próprios substituem os do shadcn", () => {
    expect(cn("rounded-md", "rounded-control")).toBe("rounded-control");
    expect(cn("rounded-card", "rounded-cover")).toBe("rounded-cover");
  });

  test("a curva própria substitui a padrão", () => {
    expect(cn("ease-out", "ease-standard")).toBe("ease-standard");
  });

  test("a animação de shimmer substitui outra animação", () => {
    expect(cn("animate-pulse", "animate-shimmer")).toBe("animate-shimmer");
  });

  test("cor e tamanho de texto convivem", () => {
    expect(cn("text-sm", "text-brand")).toBe("text-sm text-brand");
    expect(cn("bg-muted", "bg-surface")).toBe("bg-surface");
  });

  test("junta condicionais como o clsx", () => {
    expect(cn("p-2", false && "hidden", { "font-serif": true }, "p-4")).toBe(
      "font-serif p-4",
    );
  });
});
