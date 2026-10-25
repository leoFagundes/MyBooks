// Códigos do Supabase Auth (AuthError.code) em mensagens curtas e gentis
const MESSAGES = new Map<string, string>([
  ["invalid_credentials", "E-mail ou senha não conferem."],
  [
    "email_not_confirmed",
    "Confirme seu e-mail antes de entrar: o link está na sua caixa de entrada.",
  ],
  ["user_already_exists", "Esse e-mail já tem conta. Que tal entrar?"],
  ["email_exists", "Esse e-mail já tem conta. Que tal entrar?"],
  [
    "weak_password",
    "Essa senha é fácil de adivinhar. Tente uma mais longa, com letras e números.",
  ],
  [
    "over_email_send_rate_limit",
    "Mandamos e-mails demais agora há pouco. Espere alguns minutos e tente de novo.",
  ],
  [
    "over_request_rate_limit",
    "Muitas tentativas seguidas. Espere um pouco e tente de novo.",
  ],
  [
    "otp_expired",
    "Esse link venceu ou já foi usado. Peça um novo para entrar.",
  ],
  [
    "provider_disabled",
    "O login com Google ainda não está ligado. Entre com e-mail e senha ou com o link mágico.",
  ],
  ["access_denied", "O login foi cancelado. Tente de novo quando quiser."],
  ["signup_disabled", "Os cadastros estão fechados no momento."],
  ["email_address_invalid", "Esse e-mail não parece certo."],
]);

const FALLBACK = "Algo não deu certo. Tente de novo em instantes.";

export function authErrorMessage(code: string | null | undefined): string {
  return (code && MESSAGES.get(code)) || FALLBACK;
}
