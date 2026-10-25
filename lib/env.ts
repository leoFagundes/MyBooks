import { z } from "zod";

const publicEnvSchema = z.object({
  supabaseUrl: z.url({
    protocol: /^https$/,
    error: "NEXT_PUBLIC_SUPABASE_URL precisa ser a URL https do projeto",
  }),
  supabasePublishableKey: z
    .string({ error: "Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" })
    .startsWith("sb_publishable_", {
      error:
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY precisa ser a chave publicável (sb_publishable_…)",
    }),
  siteUrl: z.url().default("http://localhost:3000"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv(input: {
  [K in keyof PublicEnv]: string | undefined;
}): PublicEnv {
  const result = publicEnvSchema.safeParse(input);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => issue.message);
    throw new Error(`Variáveis de ambiente inválidas: ${problems.join("; ")}`);
  }
  return result.data;
}

let cached: PublicEnv | undefined;

/**
 * Variáveis públicas validadas. Cada uma é lida por extenso porque no
 * navegador o Next só troca `process.env.NEXT_PUBLIC_…` escrito assim.
 */
export function getPublicEnv(): PublicEnv {
  cached ??= parsePublicEnv({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  });
  return cached;
}
