import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { EditProfileSheet } from "@/features/profile/components/edit-profile-sheet";
import {
  ProfileHeader,
  ProfileHeaderSkeleton,
} from "@/features/profile/components/profile-header";
import {
  ProfileTabs,
  ProfileTabsSkeleton,
} from "@/features/profile/components/profile-tabs";
import {
  canSeeContent,
  getProfileCounts,
  getProfileFromParam,
  getProfileRelation,
} from "@/features/profile/queries";
import { FollowButton } from "@/features/social/components/follow-button";
import { relationToState } from "@/features/social/lib/follow-state";
import { routes } from "@/lib/routes";

type Params = LayoutProps<"/u/[username]">["params"];

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const profile = await getProfileFromParam((await params).username);
  if (!profile) return { title: "Perfil não encontrado" };
  return {
    title: `${profile.displayName} (@${profile.username})`,
    description:
      profile.bio ?? `A estante de ${profile.displayName} no MyBooks.`,
    alternates: { canonical: routes.profile(profile.username) },
  };
}

// Perfil e estante são a mesma página (spec §5.4): o cabeçalho e as abas
// ficam no layout, e cada aba é uma página. O @ só chega no pedido, então
// tudo que depende dele mora num Suspense. Cada aba confere a privacidade
// por conta própria: a página da aba sempre renderiza, e é ela que mostra ao
// Next que a rota é dinâmica (sem isso, o generateMetadata, que lê o @, é
// acusado de travar o prefetch do perfil privado).
export default function ProfileLayout({
  children,
  params,
}: LayoutProps<"/u/[username]">) {
  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <Suspense
          fallback={
            <div className="flex flex-col gap-8">
              <ProfileHeaderSkeleton />
              <ProfileTabsSkeleton />
            </div>
          }
        >
          <ProfileTop params={params} />
        </Suspense>
        {children}
      </main>
    </PageTransition>
  );
}

async function ProfileTop({ params }: { params: Params }) {
  const profile = await getProfileFromParam((await params).username);
  if (!profile) notFound();
  const [counts, relation] = await Promise.all([
    getProfileCounts(profile),
    getProfileRelation(profile),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <ProfileHeader
        profile={profile}
        counts={counts}
        lists={canSeeContent(profile, relation)}
        isSelf={relation === "self"}
        action={
          relation === "self" ? (
            <EditProfileSheet profile={profile} />
          ) : (
            <FollowButton
              reader={{
                id: profile.id,
                username: profile.username,
                isPrivate: profile.isPrivate,
              }}
              state={relationToState(relation)}
            />
          )
        }
      />
      <ProfileTabs username={profile.username} />
    </div>
  );
}
