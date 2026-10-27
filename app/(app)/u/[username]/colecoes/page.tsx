import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { EmptyState } from "@/components/ui/empty-state";
import { CollectionsIllustration } from "@/components/ui/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { PrivateProfileNotice } from "@/features/profile/components/private-profile-notice";
import { getProfileFromParam, getProfileTab } from "@/features/profile/queries";

type Params = PageProps<"/u/[username]/colecoes">["params"];

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const profile = await getProfileFromParam((await params).username);
  return {
    title: profile ? `Coleções de ${profile.displayName}` : "Coleções",
  };
}

const firstName = (name: string) => name.split(/\s+/)[0] || name;

// As coleções chegam com a Fase 4; por enquanto, o estado vazio
export default function ProfileCollectionsPage({
  params,
}: PageProps<"/u/[username]/colecoes">) {
  return (
    <Suspense fallback={<Skeleton className="h-56 w-full rounded-card" />}>
      <CollectionsTab params={params} />
    </Suspense>
  );
}

async function CollectionsTab({ params }: { params: Params }) {
  const tab = await getProfileTab((await params).username);
  if (!tab) return null;
  const { profile, relation } = tab;
  if (!tab.visible) {
    return <PrivateProfileNotice profile={profile} relation={relation} />;
  }

  return (
    <PageTransition>
      <EmptyState
        illustration={CollectionsIllustration}
        title={
          relation === "self"
            ? "Suas coleções vão morar aqui"
            : `${firstName(profile.displayName)} ainda não tem coleções`
        }
        description={
          relation === "self"
            ? "Junte livros por tema, por humor ou por quem indicou. Já já dá para criar a primeira."
            : "Quando aparecer uma, ela fica aqui."
        }
      />
    </PageTransition>
  );
}
