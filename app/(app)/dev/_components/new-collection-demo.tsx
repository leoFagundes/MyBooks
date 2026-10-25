"use client";

import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CollectionForm } from "@/features/collections/components/collection-form";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** "Nova coleção" na vitrine: o formulário de verdade, sem salvar nada. */
export function NewCollectionDemo() {
  return (
    <CollectionForm
      mode="create"
      trigger={
        <Button className="self-start">
          <PlusIcon className="size-4" />
          Nova coleção
        </Button>
      }
      onSubmit={async () => {
        await wait(300);
        toast("Coleção criada", { description: "Na vitrine, nada é salvo." });
        return { ok: true, data: undefined };
      }}
    />
  );
}
