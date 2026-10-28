"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useState } from "react";
import { routes } from "@/lib/routes";
import { createCollection } from "../actions";
import { CollectionForm } from "./collection-form";

const NewCollectionContext = createContext<(() => void) | null>(null);

/**
 * O formulário de "Nova coleção" aberto de qualquer lugar (o ⌘K). Criada, a
 * coleção abre na página dela.
 */
export function NewCollectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <NewCollectionContext value={() => setOpen(true)}>
      {children}
      <CollectionForm
        mode="create"
        open={open}
        onOpenChange={setOpen}
        onSubmit={async (data) => {
          const result = await createCollection(data);
          if (result.ok) router.push(routes.collection(result.data.id));
          return result;
        }}
      />
    </NewCollectionContext>
  );
}

export function useNewCollection() {
  const open = use(NewCollectionContext);
  if (!open)
    throw new Error("useNewCollection precisa do <NewCollectionProvider>");
  return open;
}
