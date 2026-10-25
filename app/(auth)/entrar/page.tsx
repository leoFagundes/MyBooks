import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCardSkeleton } from "@/features/auth/components/auth-card";
import { SignInCard } from "@/features/auth/components/auth-cards";

export const metadata: Metadata = { title: "Entrar" };

export default function SignInPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <SignInCard searchParams={searchParams} />
    </Suspense>
  );
}
