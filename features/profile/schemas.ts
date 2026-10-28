import { z } from "zod";
import { PASSWORD_MIN } from "@/features/auth/schemas";
import { GENRE_SLUGS, type GenreSlug } from "./genres";
import { RESERVED_USERNAMES } from "./lib/username";

// As mesmas regras dos checks de profiles (migration dos perfis)
export const usernameSchema = z
  .string()
  .regex(/^[a-z0-9_]{3,20}$/, "Use de 3 a 20 letras, números ou _")
  .refine(
    (username) => !RESERVED_USERNAMES.includes(username),
    "Esse @ é reservado",
  );

const AVATAR_PATH = /^avatars\/[0-9a-f-]{36}\/[A-Za-z0-9_-][A-Za-z0-9._-]*$/;

export const profileStepSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Diga seu nome")
    .max(60, "Até 60 caracteres"),
  username: usernameSchema,
  avatarPath: z.string().regex(AVATAR_PATH, "Avatar inválido").nullable(),
});

export type ProfileStepValues = z.input<typeof profileStepSchema>;

export const genresSchema = z
  .array(
    z.enum(GENRE_SLUGS as [GenreSlug, ...GenreSlug[]], {
      error: "Gênero desconhecido",
    }),
  )
  .transform((genres) => [...new Set(genres)])
  .pipe(
    z
      .array(z.enum(GENRE_SLUGS as [GenreSlug, ...GenreSlug[]]))
      .max(10, "Escolha até 10"),
  );

/** O que a gaveta "Editar perfil" muda (o @ fica para as configurações). */
export const editProfileSchema = z.object({
  displayName: profileStepSchema.shape.displayName,
  bio: z
    .string()
    .trim()
    .max(160, "Até 160 caracteres")
    .transform((bio) => bio || null),
  avatarPath: profileStepSchema.shape.avatarPath,
  genres: genresSchema,
  isPrivate: z.boolean({ error: "Privacidade inválida" }),
});

export type EditProfileValues = z.input<typeof editProfileSchema>;

/** Senha nova nas configurações, com a mesma regra do cadastro. */
export const passwordChangeSchema = z
  .object({
    password: z
      .string()
      .min(
        PASSWORD_MIN,
        `A senha precisa de ${PASSWORD_MIN} caracteres ou mais`,
      )
      .max(72, "Até 72 caracteres"),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    path: ["confirm"],
    message: "As duas senhas não batem",
  });

export type PasswordChangeValues = z.input<typeof passwordChangeSchema>;

/** Excluir a conta só com o @ digitado (com ou sem a arroba). */
export const deleteAccountSchema = z.object({
  confirm: z
    .string()
    .trim()
    .toLowerCase()
    .max(40)
    .transform((typed) => typed.replace(/^@+/, "")),
});
