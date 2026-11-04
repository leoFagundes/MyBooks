import { z } from "zod";
import { PASSWORD_MIN } from "@/features/auth/schemas";
import {
  GENRE_NAME_MAX,
  GENRE_NAME_MIN,
  genreSlug,
  isOffensive,
  normalizeGenreName,
} from "./lib/genre-name";
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

// Os favoritos são slugs (os oficiais e os criados por leitores): o banco
// confere que o gênero existe e que quem salva o enxerga
export const genresSchema = z
  .array(
    z
      .string()
      .max(GENRE_NAME_MAX, "Gênero desconhecido")
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Gênero desconhecido"),
  )
  .transform((genres) => [...new Set(genres)])
  .pipe(z.array(z.string()).max(10, "Escolha até 10"));

/** O nome de um gênero novo: tamanho, letras de verdade e nada de palavrão. */
export const genreNameSchema = z
  .string({ error: "Dê um nome ao gênero" })
  .transform(normalizeGenreName)
  .pipe(
    z
      .string()
      .min(GENRE_NAME_MIN, "Pelo menos 2 letras")
      .max(GENRE_NAME_MAX, "Até 40 letras")
      .refine((name) => genreSlug(name).length >= 2, "Use letras ou números")
      .refine((name) => !isOffensive(name), "Esse nome não pode virar gênero"),
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
    /** A senha atual (quem tem senha confirma com ela; o servidor confere). */
    current: z.string().max(72).optional(),
  })
  .refine((values) => values.password === values.confirm, {
    path: ["confirm"],
    message: "As duas senhas não batem",
  });

export type PasswordChangeValues = z.input<typeof passwordChangeSchema>;

/** Excluir a conta só com o @ digitado (com ou sem a arroba). */
export const deleteAccountSchema = z.object({
  /** A senha atual, para quem tem (o servidor confere). */
  password: z.string().max(72).optional(),
  confirm: z
    .string()
    .trim()
    .toLowerCase()
    .max(40)
    .transform((typed) => typed.replace(/^@+/, "")),
});
