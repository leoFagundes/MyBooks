import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyShelfIllustration } from "@/components/ui/illustrations";
import { formatNumber } from "@/lib/format";
import { initials } from "@/lib/initials";
import { routes } from "@/lib/routes";
import type { BookCommunity, CommunityReader } from "../queries";
import { StarRatingDisplay } from "./star-rating";

function ReaderAvatar({
  reader,
  className,
}: {
  reader: CommunityReader;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      {reader.avatarUrl ? <AvatarImage src={reader.avatarUrl} alt="" /> : null}
      <AvatarFallback>{initials(reader.displayName)}</AvatarFallback>
    </Avatar>
  );
}

/**
 * O livro nas outras estantes: quem leu (avatares empilhados), as resenhas e
 * as coleções em que ele está. Só aparece o que a privacidade deixa ver.
 */
export function CommunityBlock({ community }: { community: BookCommunity }) {
  const { readers, readersCount, reviews, collections } = community;

  if (readersCount === 0 && reviews.length === 0 && collections.length === 0) {
    return (
      <EmptyState
        illustration={EmptyShelfIllustration}
        title="Ninguém por aqui ainda"
        description="Quando alguém ler este livro, aparece aqui."
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {readersCount > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <ul aria-label="Quem leu" className="flex -space-x-2">
            {readers.map((reader) => (
              <li key={reader.username}>
                <Link
                  href={routes.profile(reader.username)}
                  aria-label={reader.displayName}
                  className="block rounded-full"
                >
                  <ReaderAvatar
                    reader={reader}
                    className="size-8 ring-2 ring-background"
                  />
                </Link>
              </li>
            ))}
          </ul>
          <p className="font-mono text-xs text-muted-foreground">
            {formatNumber(readersCount)}{" "}
            {readersCount === 1
              ? "pessoa leu ou está lendo"
              : "pessoas leram ou estão lendo"}
          </p>
        </div>
      ) : null}

      {reviews.length > 0 ? (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-medium">Resenhas</h3>
          <ul className="flex flex-col gap-5">
            {reviews.map((review) => (
              <li key={review.username} className="flex gap-3">
                <Link
                  href={routes.profile(review.username)}
                  tabIndex={-1}
                  aria-hidden
                  className="shrink-0"
                >
                  <ReaderAvatar reader={review} className="size-9" />
                </Link>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <Link
                      href={routes.profile(review.username)}
                      className="rounded-control font-medium underline-offset-4 hover:underline"
                    >
                      {review.displayName}
                    </Link>
                    {review.rating !== null ? (
                      <StarRatingDisplay value={review.rating} />
                    ) : null}
                  </p>
                  <p className="text-sm leading-relaxed text-pretty whitespace-pre-line">
                    {review.review}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {collections.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">Em coleções</h3>
          <ul className="flex flex-col gap-2">
            {collections.map((collection) => (
              <li key={collection.id}>
                <Link
                  href={routes.collection(collection.id)}
                  className="flex items-center gap-3 rounded-card border border-border px-4 py-3 transition-colors hover:bg-muted"
                >
                  <span aria-hidden className="text-lg">
                    {collection.emoji ?? "📚"}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {collection.title}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      de @{collection.owner.username}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
