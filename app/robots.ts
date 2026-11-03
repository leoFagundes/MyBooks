import type { MetadataRoute } from "next";
import { getPublicEnv } from "@/lib/env";

/**
 * O que os buscadores podem ler (spec §7): tudo, menos as rotas internas e
 * as telas que só existem para quem está logado.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getPublicEnv().siteUrl.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dev",
        "/inicio",
        "/onboarding",
        "/configuracoes",
        "/admin",
        "/manutencao",
        "/auth/",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
