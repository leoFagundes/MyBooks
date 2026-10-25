import { describe, expect, test } from "vitest";
import { parsePublicEnv } from "./env";

const valid = {
  supabaseUrl: "https://pdlxsimtcamwadfbjyjm.supabase.co",
  supabasePublishableKey: "sb_publishable_abc123",
  siteUrl: "https://mybooks.app",
};

describe("parsePublicEnv", () => {
  test("aceita a URL https do projeto e a chave publicável", () => {
    expect(parsePublicEnv(valid)).toEqual(valid);
  });

  test("sem endereço do site, usa o localhost", () => {
    expect(parsePublicEnv({ ...valid, siteUrl: undefined }).siteUrl).toBe(
      "http://localhost:3000",
    );
  });

  // Uma chave secreta aqui iria parar no navegador de todo mundo
  test("recusa a chave secreta no lugar da publicável", () => {
    expect(() =>
      parsePublicEnv({ ...valid, supabasePublishableKey: "sb_secret_xyz" }),
    ).toThrow(/chave publicável/);
  });

  test("recusa URL ausente ou sem https", () => {
    expect(() => parsePublicEnv({ ...valid, supabaseUrl: undefined })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
    expect(() =>
      parsePublicEnv({ ...valid, supabaseUrl: "http://x.supabase.co" }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});
