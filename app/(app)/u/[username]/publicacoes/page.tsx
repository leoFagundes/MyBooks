import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ReadersIllustration } from "@/components/ui/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfilePosts } from "@/features/community/components/profile-posts";
import { getProfilePosts } from "@/features/community/queries";
import { PrivateProfileNotice } from "@/features/profile/components/private-profile-notice";
import { getProfileFromParam, getProfileTab } from "@/features/profile/queries";
import { routes } from "@/lib/routes";

type Params = PageProps<"/u/[username]/publicacoes">["params"];

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const profile = await getProfileFromParam((await params).username);
  return {
    title: profile ? `Publicações de ${profile.displayName}` : "Publicações",
  };
}

const firstName = (name: string) => name.split(/\s+/)[0] || name;

/** Aba Publicações: os tópicos que a pessoa abriu e as respostas que deu. */
export default function ProfilePostsPage({
  params,
}: PageProps<"/u/[username]/publicacoes">) {
  return (
    <Suspense fallback={<PostsSkeleton />}>
      <PostsTab params={params} />
    </Suspense>
  );
}

async function PostsTab({ params }: { params: Params }) {
  const tab = await getProfileTab((await params).username);
  if (!tab) return null;
  const { profile, relation } = tab;
  if (!tab.visible) {
    return <PrivateProfileNotice profile={profile} relation={relation} />;
  }
  const posts = await getProfilePosts(profile.id);
  const self = relation === "self";

  return (
    <PageTransition>
      {posts.topics.length > 0 || posts.replies.length > 0 ? (
        <ProfilePosts topics={posts.topics} replies={posts.replies} />
      ) : (
        <EmptyState
          illustration={ReadersIllustration}
          title={
            self
              ? "Nada publicado na comunidade ainda"
              : `${firstName(profile.displayName)} ainda não publicou na comunidade`
          }
          description={
            self
              ? "Abra uma conversa sobre o livro que você está lendo, ou responda a alguém."
              : "Quando abrir um tópico ou responder a alguém, aparece aqui."
          }
          action={
            self ? (
              <Button asChild variant="outline">
                <Link href={routes.comunidade}>Ir para a comunidade</Link>
              </Button>
            ) : undefined
          }
        />
      )}
    </PageTransition>
  );
}

function PostsSkeleton() {
  return (
    <div
      aria-busy
      aria-label="Carregando as publicações"
      className="flex flex-col gap-4"
    >
      {[0, 1, 2].map((row) => (
        <Skeleton key={row} className="h-24 w-full rounded-card" />
      ))}
    </div>
  );
}
