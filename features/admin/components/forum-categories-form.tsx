"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/action";
import { formatNumber } from "@/lib/format";
import { deleteCategory, saveCategory } from "../actions";
import type { AdminCategory } from "../queries";

type Draft = { name: string; description: string; position: string };

/** Uma categoria: nome, descrição, ordem; excluir só a vazia. */
function CategoryRow({
  category,
  onDone,
}: {
  category: AdminCategory | null;
  onDone: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<Draft>({
    name: category?.name ?? "",
    description: category?.description ?? "",
    position: String(category?.position ?? 99),
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, message: string) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(message);
      if (!category) setDraft({ name: "", description: "", position: "99" });
      onDone();
    });
  }

  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr_5rem]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-nome`}>Nome</Label>
          <Input
            id={`${id}-nome`}
            value={draft.name}
            maxLength={40}
            onChange={(event) =>
              setDraft({ ...draft, name: event.target.value })
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-descricao`}>Descrição</Label>
          <Input
            id={`${id}-descricao`}
            value={draft.description}
            maxLength={200}
            onChange={(event) =>
              setDraft({ ...draft, description: event.target.value })
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-ordem`}>Ordem</Label>
          <Input
            id={`${id}-ordem`}
            inputMode="numeric"
            value={draft.position}
            className="font-mono"
            onChange={(event) =>
              setDraft({ ...draft, position: event.target.value })
            }
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(
              () =>
                saveCategory({
                  id: category?.id ?? null,
                  name: draft.name,
                  description: draft.description,
                  position: draft.position,
                }),
              category ? "Categoria salva" : "Categoria criada",
            )
          }
        >
          {category ? "Salvar" : "Criar categoria"}
        </Button>
        {category ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending || category.topics > 0}
              onClick={() =>
                run(() => deleteCategory(category.id), "Categoria excluída")
              }
            >
              Excluir
            </Button>
            <span className="font-mono text-xs text-muted-foreground">
              {formatNumber(category.topics)}{" "}
              {category.topics === 1 ? "tópico" : "tópicos"}
              {category.topics > 0 ? " · mova-os antes de excluir" : ""}
            </span>
          </>
        ) : null}
      </div>
      <div aria-live="polite">
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/** As categorias do fórum (MELHORIAS 8), gerenciáveis pelo admin. */
export function ForumCategoriesForm({
  categories,
}: {
  categories: AdminCategory[];
}) {
  const router = useRouter();
  return (
    <section className="flex flex-col gap-2 rounded-card border border-border p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-2xl tracking-tight">
          Categorias do fórum
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">
          Os tópicos da comunidade ficam nelas. A ordem vale para a lista e o
          editor.
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {categories.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            onDone={() => router.refresh()}
          />
        ))}
        <CategoryRow category={null} onDone={() => router.refresh()} />
      </ul>
    </section>
  );
}
