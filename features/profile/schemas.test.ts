import { describe, expect, test } from "vitest";
import {
  editProfileSchema,
  genresSchema,
  profileStepSchema,
  usernameSchema,
} from "./schemas";

const message = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

const AVATAR = "avatars/8f557e4a-1bd6-500d-956f-20aca9f39731/1730000000.webp";

describe("@ do perfil", () => {
  test("de 3 a 20 letras minúsculas, números ou _", () => {
    const format = "Use de 3 a 20 letras, números ou _";
    expect(message(usernameSchema.safeParse("an"))).toBe(format);
    expect(message(usernameSchema.safeParse("a".repeat(21)))).toBe(format);
    expect(message(usernameSchema.safeParse("ana-livia"))).toBe(format);
    expect(message(usernameSchema.safeParse("Ana"))).toBe(format);
    expect(usernameSchema.safeParse("ana_livia").success).toBe(true);
  });

  test("nomes reservados ficam de fora", () => {
    expect(message(usernameSchema.safeParse("admin"))).toBe(
      "Esse @ é reservado",
    );
    expect(message(usernameSchema.safeParse("explorar"))).toBe(
      "Esse @ é reservado",
    );
  });
});

describe("passo do perfil", () => {
  test("nome aparado, de 1 a 60 caracteres", () => {
    expect(
      profileStepSchema.parse({
        displayName: "  Ana Lívia  ",
        username: "ana_livia",
        avatarPath: null,
      }).displayName,
    ).toBe("Ana Lívia");
    expect(
      message(
        profileStepSchema.safeParse({
          displayName: "   ",
          username: "ana_livia",
          avatarPath: null,
        }),
      ),
    ).toBe("Diga seu nome");
    expect(
      message(
        profileStepSchema.safeParse({
          displayName: "a".repeat(61),
          username: "ana_livia",
          avatarPath: null,
        }),
      ),
    ).toBe("Até 60 caracteres");
  });

  test("avatar só da pasta de avatares", () => {
    const base = { displayName: "Ana", username: "ana_livia" };
    expect(
      profileStepSchema.safeParse({ ...base, avatarPath: AVATAR }).success,
    ).toBe(true);
    expect(
      profileStepSchema.safeParse({
        ...base,
        avatarPath: "https://exemplo.com/a.png",
      }).success,
    ).toBe(false);
  });
});

describe("gêneros", () => {
  test("só os gêneros do MyBooks, sem repetir, até 10", () => {
    expect(genresSchema.parse(["poesia", "poesia", "contos"])).toEqual([
      "poesia",
      "contos",
    ]);
    expect(message(genresSchema.safeParse(["nao-existe"]))).toBe(
      "Gênero desconhecido",
    );
    expect(
      message(
        genresSchema.safeParse([
          "literatura-brasileira",
          "classicos",
          "ficcao",
          "romance",
          "contos",
          "poesia",
          "fantasia",
          "ficcao-cientifica",
          "distopia",
          "terror",
          "misterio",
        ]),
      ),
    ).toBe("Escolha até 10");
  });
});

describe("editar perfil", () => {
  const edit = (overrides: Record<string, unknown>) =>
    editProfileSchema.safeParse({
      displayName: "Ana Souza",
      bio: "",
      avatarPath: null,
      genres: [],
      isPrivate: false,
      ...overrides,
    });

  test("bio aparada, até 160 caracteres; vazia vira null", () => {
    expect(edit({ bio: "  Machado no ônibus.  " }).data?.bio).toBe(
      "Machado no ônibus.",
    );
    expect(edit({ bio: "   " }).data?.bio).toBeNull();
    expect(message(edit({ bio: "a".repeat(161) }))).toBe("Até 160 caracteres");
  });

  test("nome obrigatório, gêneros conhecidos e privacidade sim ou não", () => {
    expect(message(edit({ displayName: " " }))).toBe("Diga seu nome");
    expect(
      edit({ genres: ["poesia", "poesia", "contos"] }).data?.genres,
    ).toEqual(["poesia", "contos"]);
    expect(edit({ genres: ["sertanejo"] }).success).toBe(false);
    expect(edit({ isPrivate: "sim" }).success).toBe(false);
    expect(edit({ isPrivate: true }).data?.isPrivate).toBe(true);
  });

  test("a foto nova é um caminho do bucket de avatares", () => {
    expect(edit({ avatarPath: AVATAR }).success).toBe(true);
    expect(edit({ avatarPath: "https://exemplo.com/eu.png" }).success).toBe(
      false,
    );
  });
});
