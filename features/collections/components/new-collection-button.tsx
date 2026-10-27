"use client";

import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { createCollection } from "../actions";
import { CollectionForm } from "./collection-form";

/** "Nova coleção": o formulário na gaveta e, criada, a página dela. */
export function NewCollectionButton({
  variant = "primary",
}: {
  variant?: "primary" | "outline";
}) {
  const router = useRouter();

  return (
    <CollectionForm
      mode="create"
      trigger={
        <Button variant={variant}>
          <PlusIcon className="size-4" />
          Nova coleção
        </Button>
      }
      onSubmit={async (data) => {
        const result = await createCollection(data);
        if (result.ok) router.push(routes.collection(result.data.id));
        return result;
      }}
    />
  );
}
