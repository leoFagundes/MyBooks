import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import {
  SettingsSections,
  SettingsSkeleton,
} from "@/features/profile/components/settings/settings-sections";
import {
  getAccountEmail,
  getOwnFavoriteGenres,
  getProfileByUsername,
} from "@/features/profile/queries";
import { GoodreadsImport } from "@/features/shelf/components/goodreads-import";
import { requireViewer } from "@/lib/auth";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Configurações",
  robots: { index: false },
};

/** Configurações (spec §5.10): perfil, conta, privacidade, tema e seus dados. */
export default function SettingsPage() {
  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col gap-2">
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">
            Configurações
          </h1>
          <p className="text-sm text-muted-foreground">
            Seu perfil, sua conta e seus dados.
          </p>
        </header>
        <Suspense fallback={<SettingsSkeleton />}>
          <Settings />
        </Suspense>
      </main>
    </PageTransition>
  );
}

async function Settings() {
  const viewer = await requireViewer();
  if (!viewer.onboarded) redirect(routes.onboarding);
  const [profile, email, genres] = await Promise.all([
    getProfileByUsername(viewer.username),
    getAccountEmail(viewer.username),
    getOwnFavoriteGenres(viewer),
  ]);
  if (!profile) notFound();
  return (
    <SettingsSections
      profile={profile}
      genres={genres}
      email={email}
      importer={<GoodreadsImport username={profile.username} />}
    />
  );
}
