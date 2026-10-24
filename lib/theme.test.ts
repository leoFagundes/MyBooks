import { runInNewContext } from "node:vm";
import { describe, expect, test } from "vitest";
import {
  THEME_STORAGE_KEY,
  parseThemePreference,
  resolveTheme,
  themeInitScript,
} from "./theme";

type ScriptEnv = {
  stored?: string | null;
  storageThrows?: boolean;
  prefersDark?: boolean;
};

// Roda o script do <head> num navegador de mentira e devolve o que ele aplicou.
function runInitScript({
  stored = null,
  storageThrows = false,
  prefersDark = false,
}: ScriptEnv) {
  const attributes: Record<string, string> = {};
  const style: Record<string, string> = {};
  const context = {
    document: {
      documentElement: {
        style,
        setAttribute: (name: string, value: string) => {
          attributes[name] = value;
        },
      },
    },
    localStorage: {
      getItem: (key: string) => {
        if (storageThrows) throw new Error("armazenamento bloqueado");
        return key === THEME_STORAGE_KEY ? stored : null;
      },
    },
    matchMedia: (query: string) => ({
      matches: query === "(prefers-color-scheme: dark)" && prefersDark,
    }),
  };
  runInNewContext(themeInitScript, context);
  return { theme: attributes["data-theme"], colorScheme: style.colorScheme };
}

describe("parseThemePreference", () => {
  test.each(["light", "dark", "system"] as const)("aceita %s", (value) => {
    expect(parseThemePreference(value)).toBe(value);
  });

  test.each(["azul", "", null, undefined, 42])(
    "trata %s como sistema",
    (value) => {
      expect(parseThemePreference(value)).toBe("system");
    },
  );
});

describe("resolveTheme", () => {
  test("escolhas explícitas ignoram o sistema", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  test("sistema segue o prefers-color-scheme", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});

describe("themeInitScript", () => {
  test("aplica o tema salvo antes do React carregar", () => {
    expect(runInitScript({ stored: "dark" })).toEqual({
      theme: "dark",
      colorScheme: "dark",
    });
    expect(runInitScript({ stored: "light", prefersDark: true })).toEqual({
      theme: "light",
      colorScheme: "light",
    });
  });

  test("sem escolha salva, segue o sistema", () => {
    expect(runInitScript({ prefersDark: true }).theme).toBe("dark");
    expect(runInitScript({ prefersDark: false }).theme).toBe("light");
  });

  test("valor inválido salvo vira sistema", () => {
    expect(runInitScript({ stored: "azul", prefersDark: true }).theme).toBe(
      "dark",
    );
  });

  test("sobrevive a um localStorage bloqueado", () => {
    expect(
      runInitScript({ storageThrows: true, prefersDark: true }).theme,
    ).toBe("dark");
  });
});
