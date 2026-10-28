import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ReadersIllustration } from "@/components/ui/illustrations";
import { routes } from "@/lib/routes";
import { readsLine } from "../../lib/reads-line";
import { getHomeSuggestions } from "../../queries";
import { PopularCollections } from "../explore/explore-sections";
import { ReaderRow } from "../reader-row";

/**
 * O Início sem feed (spec §5.3): um convite, leitores para seguir e as
 * coleções populares.
 */
export async function FeedEmpty({
  viewerId,
  followsSomeone,
}: {
  viewerId: string;
  followsSomeone: boolean;
}) {
  const readers = await getHomeSuggestions(viewerId, 5);

  return (
    <div className="flex flex-col gap-12">
      <EmptyState
        illustration={ReadersIllustration}
        title={
          followsSomeone
            ? "Quem você segue ainda não mexeu na estante"
            : "Siga leitores para ver o que eles leem"
        }
        description={
          followsSomeone
            ? "Enquanto isso, tem mais gente lendo por aqui."
            : "O que eles começarem, terminarem e guardarem aparece aqui."
        }
        action={
          <Button asChild variant="outline">
            <Link href={routes.explorar}>Explorar</Link>
          </Button>
        }
      />
      {readers.length > 0 ? (
        <section
          aria-labelledby="leitores-para-seguir"
          className="flex flex-col gap-3"
        >
          <h2
            id="leitores-para-seguir"
            className="font-serif text-2xl tracking-tight"
          >
            Leitores para seguir
          </h2>
          <ul className="flex flex-col divide-y divide-border">
            {readers.map((reader) => (
              <li key={reader.id}>
                <ReaderRow
                  reader={reader}
                  state="none"
                  detail={readsLine(reader.favoriteGenres)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section
        aria-labelledby="colecoes-para-comecar"
        className="flex flex-col gap-5"
      >
        <h2
          id="colecoes-para-comecar"
          className="font-serif text-2xl tracking-tight"
        >
          Coleções populares
        </h2>
        <PopularCollections limit={3} />
      </section>
    </div>
  );
}
