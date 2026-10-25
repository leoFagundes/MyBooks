import { describe, expect, test } from "vitest";
import { authErrorMessage } from "./errors";

describe("mensagens do login", () => {
  test("cada código conhecido tem sua mensagem gentil", () => {
    expect(authErrorMessage("invalid_credentials")).toBe(
      "E-mail ou senha não conferem.",
    );
    expect(authErrorMessage("email_not_confirmed")).toMatch(
      /Confirme seu e-mail/,
    );
    expect(authErrorMessage("user_already_exists")).toMatch(/já tem conta/);
    expect(authErrorMessage("email_exists")).toMatch(/já tem conta/);
    expect(authErrorMessage("weak_password")).toMatch(/senha/);
    expect(authErrorMessage("over_email_send_rate_limit")).toMatch(/minutos/);
    expect(authErrorMessage("otp_expired")).toMatch(/link venceu/);
    expect(authErrorMessage("access_denied")).toMatch(/cancelado/);
  });

  test("código desconhecido ou ausente cai na mensagem padrão", () => {
    const fallback = "Algo não deu certo. Tente de novo em instantes.";
    expect(authErrorMessage("codigo_que_nao_existe")).toBe(fallback);
    expect(authErrorMessage(undefined)).toBe(fallback);
    expect(authErrorMessage(null)).toBe(fallback);
  });

  test("nome de propriedade do objeto não vira mensagem", () => {
    expect(authErrorMessage("toString")).toBe(
      "Algo não deu certo. Tente de novo em instantes.",
    );
  });
});
