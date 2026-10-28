import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { PrivateProfileNotice } from "@/features/profile/components/private-profile-notice";
import { getProfileTab } from "@/features/profile/queries";
import { ProfileShelf } from "@/features/shelf/components/profile-shelf";
import { getShelf } from "@/features/shelf/queries";
import { getViewer } from "@/lib/auth";

type Params = PageProps<"/u/[username]">["params"];

// A volta da página do livro só anima se a estante estiver pronta no clique.
// Por 5 minutos o roteador reaproveita estes dados (inclusive os da primeira
// carga) em vez de buscá-los de novo e mostrar o esqueleto, sem a lombada
export const unstable_dynamicStaleTime = 300;

const firstName = (name: string) => name.split(/\s+/)[0] || name;

/** Aba Estante: os livros da pessoa nas três visualizações. */
export default function ProfileShelfPage({
  params,
}: PageProps<"/u/[username]">) {
  return (
    <Suspense fallback={<ShelfSkeleton />}>
      <ShelfTab params={params} />
    </Suspense>
  );
}

async function ShelfTab({ params }: { params: Params }) {
  const tab = await getProfileTab((await params).username);
  if (!tab) return null;
  const { profile, relation } = tab;
  if (!tab.visible) {
    return <PrivateProfileNotice profile={profile} relation={relation} />;
  }
  const [shelf, viewer] = await Promise.all([
    getShelf(profile.id),
    getViewer(),
  ]);
  // Na estante dos outros, quem vê compara com a própria
  const ownedIds =
    viewer && relation !== "self"
      ? (await getShelf(viewer.id)).map((item) => item.book.id)
      : null;

  return (
    <PageTransition>
      <ProfileShelf
        entries={shelf}
        owner={relation === "self" ? null : firstName(profile.displayName)}
        ownerId={profile.id}
        ownedIds={ownedIds}
      />
    </PageTransition>
  );
}

function ShelfSkeleton() {
  return (
    <div
      aria-busy
      aria-label="Carregando a estante"
      className="flex flex-col gap-6"
    >
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-44 w-full" />
    </div>
  );
}
