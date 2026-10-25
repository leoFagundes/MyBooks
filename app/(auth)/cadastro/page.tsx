import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCardSkeleton } from "@/features/auth/components/auth-card";
import { SignUpCard } from "@/features/auth/components/auth-cards";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignUpPage({ searchParams }: PageProps<"/cadastro">) {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <SignUpCard searchParams={searchParams} />
    </Suspense>
  );
}
