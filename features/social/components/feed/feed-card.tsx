"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RelativeTime } from "@/components/ui/relative-time";
import { BookCover } from "@/features/books/components/book-cover";
import { BookLink } from "@/features/books/components/book-link";
import { BookShelfAction } from "@/features/shelf/components/copy-book";
import { formatNumber } from "@/lib/format";
import { initials } from "@/lib/initials";
import { routes } from "@/lib/routes";
import type { FeedGroup, Reader } from "../../types";

// Até aqui as capas aparecem; o resto fica no "e mais N"
const MAX_COVERS = 8;

const list = new Intl.ListFormat("pt-BR", { type: "conjunction" });

const linkClass =
  "rounded-sm font-medium hover:underline hover:decoration-border-strong hover:underline-offset-4";

function Title({ children }: { children: React.ReactNode }) {
  return <span className="font-serif text-[15px]">{children}</span>;
}

function CollectionLink({ group }: { group: FeedGroup }) {
  if (!group.collection) return null;
  const { id, title, emoji } = group.collection;
  return (
    <Link href={routes.collection(id)} className={linkClass}>
      {emoji ? `${emoji} ${title}` : title}
    </Link>
  );
}

function People({ people }: { people: Reader[] }) {
  const shown = people.slice(0, 2);
  const rest = people.length - shown.length;
  const names = shown.map((person) => `@${person.username}`);
  return (
    <>
      {rest > 0
        ? `${names.join(", ")} e mais ${formatNumber(rest)}`
        : list.format(names)}
    </>
  );
}

/** A frase do card: "quer ler Duna", "adicionou 3 livros a Quero ler"… */
function Sentence({ group }: { group: FeedGroup }) {
  const count = group.books.length;
  const one = count === 1 ? group.books[0] : undefined;
  const many = `${formatNumber(count)} livros`;
  switch (group.type) {
    case "shelf_want":
      return one ? (
        <>
          quer ler <Title>{one.title}</Title>
        </>
      ) : (
        <>adicionou {many} a Quero ler</>
      );
    case "shelf_reading":
      return one ? (
        <>
          começou a ler <Title>{one.title}</Title>
        </>
      ) : (
        <>começou a ler {many}</>
      );
    case "shelf_read":
      return one ? (
        <>
          terminou <Title>{one.title}</Title>
        </>
      ) : (
        <>terminou {many}</>
      );
    case "shelf_abandoned":
      return one ? (
        <>
          deixou <Title>{one.title}</Title> de lado
        </>
      ) : (
        <>deixou {many} de lado</>
      );
    case "collection_create":
      return (
        <>
          criou a coleção <CollectionLink group={group} />
        </>
      );
    case "collection_add":
      return one ? (
        <>
          pôs <Title>{one.title}</Title> em <CollectionLink group={group} />
        </>
      ) : (
        <>
          pôs {many} em <CollectionLink group={group} />
        </>
      );
    case "follow":
      return (
        <>
          começou a seguir <People people={group.people} />
        </>
      );
  }
}

/**
 * Um card do feed (spec §5.3): quem, o quê e quando; as capas levam ao
 * livro e cada uma tem o Copiar (ou o selo "Na sua estante").
 */
export function FeedCard({
  group,
  owned,
}: {
  group: FeedGroup;
  owned: ReadonlySet<string>;
}) {
  const { actor } = group;
  const covers = group.books.slice(0, MAX_COVERS);
  const hidden = group.books.length - covers.length;

  return (
    <article className="flex gap-3 sm:gap-4">
      <Link
        href={routes.profile(actor.username)}
        aria-label={actor.displayName}
        className="shrink-0 rounded-full"
      >
        <Avatar className="size-10">
          {actor.avatarUrl ? (
            <AvatarImage src={actor.avatarUrl} alt="" />
          ) : null}
          <AvatarFallback>{initials(actor.displayName)}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-0.5">
        <p className="text-sm text-pretty">
          <Link href={routes.profile(actor.username)} className={linkClass}>
            {actor.displayName}
          </Link>{" "}
          <Sentence group={group} /> <RelativeTime iso={group.at} />
        </p>
        {covers.length > 0 ? (
          <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {covers.map((book) => (
              <li
                key={book.id}
                data-copy-item
                className="group/livro relative w-20 shrink-0 sm:w-24"
              >
                <BookLink
                  book={book}
                  href={routes.book(book.id)}
                  aria-label={book.title}
                  data-copy-source
                  className="block rounded-cover"
                >
                  <BookCover book={book} size="fill" />
                </BookLink>
                <div className="absolute top-1 right-1">
                  <BookShelfAction
                    book={book}
                    fromUserId={actor.id}
                    owned={owned.has(book.id)}
                    place="feed"
                  />
                </div>
              </li>
            ))}
            {hidden > 0 ? (
              <li className="flex shrink-0 items-center px-2 font-mono text-xs text-muted-foreground">
                e mais {formatNumber(hidden)}
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
