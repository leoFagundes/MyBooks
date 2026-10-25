import { describe, expect, test } from "vitest";
import { avatarSrc } from "./avatar";

const SUPABASE = "https://abcdefghijklmnopqrst.supabase.co";
const ID = "8f557e4a-1bd6-500d-956f-20aca9f39731";

describe("avatarSrc", () => {
  test("caminho no nosso bucket vira a URL pública", () => {
    expect(avatarSrc(`avatars/${ID}/1730000000.webp`, SUPABASE)).toBe(
      `${SUPABASE}/storage/v1/object/public/avatars/${ID}/1730000000.webp`,
    );
    expect(avatarSrc(`avatars/${ID}/1.webp`, `${SUPABASE}/`)).toBe(
      `${SUPABASE}/storage/v1/object/public/avatars/${ID}/1.webp`,
    );
  });

  test("avatar do Google passa como veio", () => {
    const google = "https://lh3.googleusercontent.com/a/lia=s96-c";
    expect(avatarSrc(google, SUPABASE)).toBe(google);
  });

  test("sem avatar ou de outra origem, fica sem imagem", () => {
    expect(avatarSrc(null, SUPABASE)).toBeNull();
    expect(avatarSrc("", SUPABASE)).toBeNull();
    expect(avatarSrc("https://exemplo.com/a.png", SUPABASE)).toBeNull();
    expect(avatarSrc("avatars/../segredo.webp", SUPABASE)).toBeNull();
  });
});
