import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Logo } from "@/components/shell/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { OnboardingWizard } from "@/features/profile/components/onboarding/onboarding-wizard";
import { getOwnProfile } from "@/features/profile/queries";
import { getShelf } from "@/features/shelf/queries";
import { requireViewer } from "@/lib/auth";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Boas-vindas" };

export default function OnboardingPage() {
  return (
    <PageTransition className="flex min-h-dvh flex-col items-center px-4 py-10 sm:py-16">
      <Logo className="mb-10" />
      <main className="w-full max-w-lg">
        <Suspense fallback={<OnboardingSkeleton />}>
          <Onboarding />
        </Suspense>
      </main>
    </PageTransition>
  );
}

async function Onboarding() {
  const viewer = await requireViewer();
  if (viewer.onboarded) redirect(routes.inicio);
  const [profile, shelf] = await Promise.all([
    getOwnProfile(viewer.id),
    getShelf(viewer.id),
  ]);
  if (!profile) redirect(routes.entrar);
  return (
    <OnboardingWizard
      profile={profile}
      shelf={Object.fromEntries(
        shelf.map((item) => [item.book.id, item.status]),
      )}
    />
  );
}

function OnboardingSkeleton() {
  return (
    <div aria-busy aria-label="Carregando" className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-1.5 w-16" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <Skeleton className="h-8 w-28" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
