import { z } from "zod";
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
