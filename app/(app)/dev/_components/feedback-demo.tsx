"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  EmptyShelfIllustration,
  QuietBellIllustration,
  SearchIllustration,
} from "@/components/ui/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoRow } from "./dev-section";

function BookCardSkeleton() {
  return (
    <div className="flex w-32 flex-col gap-2.5">
      <Skeleton className="aspect-2/3 w-full rounded-cover" />
      <Skeleton className="h-3.5 w-4/5" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function FeedbackDemo() {
  return (
    <>
      <DemoRow label="Carregando">
        <BookCardSkeleton />
        <BookCardSkeleton />
        <BookCardSkeleton />
      </DemoRow>

      <div className="grid gap-4 md:grid-cols-3">
        <EmptyState
          illustration={EmptyShelfIllustration}
          title="Sua estante está esperando o primeiro livro"
          description="Comece por um que marcou você. O resto vem fácil."
          action={<Button size="sm">Adicionar livro</Button>}
        />
        <EmptyState
          illustration={SearchIllustration}
          title="Nada por aqui com esse nome"
          description="Tente o título original ou o sobrenome do autor."
          action={
            <Button size="sm" variant="outline">
              Cadastrar manualmente
            </Button>
          }
        />
        <EmptyState
          illustration={QuietBellIllustration}
          title="Tudo em dia"
          description="Quando alguém seguir você ou curtir uma coleção, aparece aqui."
        />
      </div>

      <DemoRow label="Toast">
        <Button
          variant="outline"
          onClick={() =>
            toast("Na sua estante", {
              action: {
                label: "Desfazer",
                onClick: () => toast("Pronto, desfeito."),
              },
            })
          }
        >
          Copiar livro
        </Button>
      </DemoRow>
    </>
  );
}
