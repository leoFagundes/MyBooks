import { LockIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatNumber } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { CollectionVisual, Person } from "../types";

const MAX_FACES = 4;

function Face({ person }: { person: Person }) {
  return (
    <Avatar className="size-7 ring-2 ring-background">
      {person.avatarUrl ? <AvatarImage src={person.avatarUrl} alt="" /> : null}
      <AvatarFallback className="text-[11px]">
        {person.displayName.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

type CollectionHeaderProps = {
  collection: CollectionVisual;
  /** Curtir, salvar, compartilhar, copiar e editar, conforme quem vê. */
  actions?: React.ReactNode;
  profileHref?: (username: string) => Route;
  collectionHref?: (id: string) => Route;
};

/**
 * Cabeçalho da página da coleção: emoji, título, descrição, quem fez e quem
 * colabora, o selo de privada e o crédito da cópia ("Inspirado em @fulano",
 * com link só se a origem ainda for visível para quem vê).
 */
export function CollectionHeader({
  collection,
  actions,
  profileHref = routes.profile,
  collectionHref = routes.collection,
}: CollectionHeaderProps) {
  const { owner, members, copiedFrom } = collection;
  const people = [owner, ...members];

  return (
    <header className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="flex items-center gap-3 font-serif text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl">
          {collection.emoji ? (
            <span aria-hidden>{collection.emoji}</span>
          ) : null}
          {collection.title}
        </h1>
        {collection.description ? (
          <p className="max-w-prose text-pretty text-muted-foreground">
            {collection.description}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2.5">
          <div aria-hidden className="flex -space-x-2">
            {people.slice(0, MAX_FACES).map((person) => (
              <Face key={person.username} person={person} />
            ))}
          </div>
          <p>
            por{" "}
            <Link
              href={profileHref(owner.username)}
              className="text-foreground underline-offset-4 hover:underline"
            >
              @{owner.username}
            </Link>
            {members.length > 0 ? (
              <>
                {" com "}
                {members.map((member, i) => (
                  <span key={member.username}>
                    {i > 0 ? ", " : null}
                    <Link
                      href={profileHref(member.username)}
                      className="text-foreground underline-offset-4 hover:underline"
                    >
                      @{member.username}
                    </Link>
                  </span>
                ))}
              </>
            ) : null}
          </p>
        </div>
        {collection.visibility === "private" ? (
          <span className="inline-flex items-center gap-1.5">
            <LockIcon className="size-3.5" aria-hidden />
            Privada
          </span>
        ) : null}
        {copiedFrom ? (
          <span>
            Inspirado em{" "}
            {copiedFrom.collection ? (
              <Link
                href={collectionHref(copiedFrom.collection.id)}
                className="text-foreground underline-offset-4 hover:underline"
              >
                @{copiedFrom.username}
              </Link>
            ) : (
              `@${copiedFrom.username}`
            )}
          </span>
        ) : null}
        <span className="font-mono text-xs">
          {collection.bookCount === 1
            ? "1 livro"
            : `${formatNumber(collection.bookCount)} livros`}
        </span>
      </div>

      {actions}
    </header>
  );
}
