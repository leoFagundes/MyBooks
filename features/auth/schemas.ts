import { z } from "zod";

export const PASSWORD_MIN = 8;
// O Supabase (bcrypt) não guarda mais do que isso
const PASSWORD_MAX = 72;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Digite seu e-mail")
  .pipe(z.email("Esse e-mail não parece certo"));

export const signInSchema = z.object({
  email,
  // Para entrar, só não pode faltar: a regra de tamanho vale para senha nova
  password: z.string().min(1, "Digite sua senha"),
});

export const signUpSchema = z.object({
  email,
  password: z
    .string()
    .min(PASSWORD_MIN, `A senha precisa de ${PASSWORD_MIN} caracteres ou mais`)
    .max(PASSWORD_MAX, `Até ${PASSWORD_MAX} caracteres`),
});

export const magicLinkSchema = z.object({ email });

export type SignInValues = z.input<typeof signInSchema>;
export type SignUpValues = z.input<typeof signUpSchema>;
export type MagicLinkValues = z.input<typeof magicLinkSchema>;
