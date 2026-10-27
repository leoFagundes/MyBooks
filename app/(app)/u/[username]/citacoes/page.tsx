import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { EmptyState } from "@/components/ui/empty-state";
import { QuoteIllustration } from "@/components/ui/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { PrivateProfileNotice } from "@/features/profile/components/private-profile-notice";
import { getProfileFromParam, getProfileTab } from "@/features/profile/queries";
import { QuotesList } from "@/features/shelf/components/quotes-list";
import { getQuotes } from "@/features/shelf/queries";

type Params = PageProps<"/u/[username]/citacoes">["params"];

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const profile = await getProfileFromParam((await params).username);
  return {
    title: profile ? `Citações de ${profile.displayName}` : "Citações",
  };
}

const firstName = (name: string) => name.split(/\s+/)[0] || name;

/** Aba Citações: os trechos que a pessoa guardou, com livro e página. */
export default function ProfileQuotesPage({
  params,
}: PageProps<"/u/[username]/citacoes">) {
  return (
    <Suspense fallback={<QuotesSkeleton />}>
      <QuotesTab params={params} />
    </Suspense>
  );
}

async function QuotesTab({ params }: { params: Params }) {
  const tab = await getProfileTab((await params).username);
  if (!tab) return null;
  const { profile, relation } = tab;
  if (!tab.visible) {
    return <PrivateProfileNotice profile={profile} relation={relation} />;
  }
  const quotes = await getQuotes(profile.id);

  return (
    <PageTransition>
      {quotes.length > 0 ? (
        <QuotesList quotes={quotes} />
      ) : (
        <EmptyState
          illustration={QuoteIllustration}
          title={
            relation === "self"
              ? "Nenhuma citação guardada ainda"
              : `${firstName(profile.displayName)} ainda não guardou citações`
          }
          description={
            relation === "self"
              ? "Na página de um livro, guarde o trecho que ficou com você e a página onde ele está."
              : "Quando guardar, os trechos aparecem aqui."
          }
        />
      )}
    </PageTransition>
  );
}

function QuotesSkeleton() {
  return (
    <div
      aria-busy
      aria-label="Carregando as citações"
      className="flex flex-col gap-4"
    >
      {[0, 1].map((row) => (
        <Skeleton key={row} className="h-32 w-full rounded-card" />
      ))}
    </div>
  );
}
