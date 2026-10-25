"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function HomeError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <EmptyState
        title="Sua estante não abriu agora"
        description="Pode ter sido a conexão. Tente de novo em instantes."
        action={<Button onClick={() => retry()}>Tentar de novo</Button>}
      />
    </main>
  );
}
