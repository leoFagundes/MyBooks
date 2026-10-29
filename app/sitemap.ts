import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { getPublicEnv } from "@/lib/env";
import { routes } from "@/lib/routes";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createPublicClient } from "@/lib/supabase/public";

// Os 5.000 livros mais novos do catálogo; os outros os buscadores acham pelas
// páginas que os citam
const MAX_BOOKS = 5000;

async function publicPages() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog", "explore");
  const supabase = createPublicClient();
  const [books, profiles, collections] = await Promise.all([
    fetchAll(
      (from, to) =>
        supabase
          .from("books")
          .select("id, created_at")
          .order("created_at", { ascending: false })
          .range(from, to),
      MAX_BOOKS,
    ),
    fetchAll((from, to) =>
      supabase
        .from("profiles")
        .select("username, updated_at")
        .eq("is_private", false)
        .not("onboarded_at", "is", null)
        .order("username")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("collections")
        .select("id, updated_at")
        .eq("visibility", "public")
        .order("updated_at", { ascending: false })
        .range(from, to),
    ),
  ]);
  return { books, profiles, collections };
}

/**
 * O mapa do site (spec §7): as páginas abertas, os livros do catálogo, os
 * perfis públicos e as coleções públicas. Refeito de hora em hora.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getPublicEnv().siteUrl.replace(/\/$/, "");
  const url = (path: string) => `${base}${path}`;
  const { books, profiles, collections } = await publicPages();
  return [
    { url: url(routes.home), changeFrequency: "weekly", priority: 1 },
    { url: url(routes.explorar), changeFrequency: "daily", priority: 0.8 },
    { url: url(routes.cadastro), changeFrequency: "yearly", priority: 0.5 },
    { url: url(routes.entrar), changeFrequency: "yearly", priority: 0.3 },
    ...books.map((book) => ({
      url: url(routes.book(book.id)),
      lastModified: book.created_at,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...profiles.map((profile) => ({
      url: url(routes.profile(profile.username)),
      lastModified: profile.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...collections.map((collection) => ({
      url: url(routes.collection(collection.id)),
      lastModified: collection.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
