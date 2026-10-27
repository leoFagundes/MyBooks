import { Lock } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { initials } from "@/lib/initials";
import { genreLabel } from "../genres";
import type { ProfileCounts, ProfileSummary } from "../queries";

const COUNTERS = [
  { key: "books", testId: "contador-livros", one: "livro", many: "livros" },
  {
    key: "collections",
    testId: "contador-colecoes",
    one: "coleção",
    many: "coleções",
  },
  {
    key: "followers",
    testId: "contador-seguidores",
    one: "seguidor",
    many: "seguidores",
  },
  {
    key: "following",
    testId: "contador-seguindo",
    one: "seguindo",
    many: "seguindo",
  },
] as const satisfies readonly {
  key: keyof ProfileCounts;
  testId: string;
  one: string;
  many: string;
}[];

/**
 * Cabeçalho do perfil (spec §5.4): avatar, nome, @, bio, gêneros e os
 * contadores em mono. Aparece até em perfil privado.
 */
export function ProfileHeader({
  profile,
  counts,
  action,
}: {
  profile: ProfileSummary;
  counts: ProfileCounts | null;
  /** "Editar perfil" no seu; "Seguir" no dos outros (Fase 5). */
  action?: React.ReactNode;
}) {
  const genres = profile.favoriteGenres.flatMap((slug) => {
    const label = genreLabel(slug);
    return label ? [{ slug, label }] : [];
  });

  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8">
      <Avatar className="size-20 sm:size-28">
        {profile.avatarUrl ? (
          <AvatarImage src={profile.avatarUrl} alt="" />
        ) : null}
        <AvatarFallback className="font-serif text-2xl sm:text-3xl">
          {initials(profile.displayName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="font-serif text-4xl leading-none tracking-tight text-balance sm:text-5xl">
              {profile.displayName}
            </h1>
            <p className="flex items-center gap-1.5 font-mono text-sm text-muted-foreground">
              @{profile.username}
              {profile.isPrivate ? (
                <Lock className="size-3.5" aria-label="Perfil privado" />
              ) : null}
            </p>
          </div>
          {action}
        </div>

        {profile.bio ? (
          <p className="max-w-prose text-pretty">{profile.bio}</p>
        ) : null}

        {genres.length > 0 ? (
          <ul aria-label="Gêneros favoritos" className="flex flex-wrap gap-1.5">
            {genres.map((genre) => (
              <li
                key={genre.slug}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
              >
                {genre.label}
              </li>
            ))}
          </ul>
        ) : null}

        {counts ? (
          <ul
            aria-label="Números do perfil"
            className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-muted-foreground"
          >
            {COUNTERS.map((counter) => {
              const value = counts[counter.key];
              return (
                <li key={counter.key} data-testid={counter.testId}>
                  <AnimatedNumber value={value} className="text-foreground" />{" "}
                  {value === 1 ? counter.one : counter.many}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </header>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div
      aria-busy
      aria-label="Carregando o perfil"
      className="flex flex-col gap-5 sm:flex-row sm:gap-8"
    >
      <Skeleton className="size-20 shrink-0 rounded-full sm:size-28" />
      <div className="flex flex-1 flex-col gap-4">
        <Skeleton className="h-11 w-56" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-3 w-64" />
      </div>
    </div>
  );
}
