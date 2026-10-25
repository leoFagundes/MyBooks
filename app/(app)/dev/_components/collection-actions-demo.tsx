"use client";

import { PencilIcon } from "lucide-react";
import type { Route } from "next";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  CopyCollectionButton,
  LikeButton,
  SaveButton,
  ShareButton,
} from "@/features/collections/components/collection-actions";
import { CollectionForm } from "@/features/collections/components/collection-form";
import { CollectionHeader } from "@/features/collections/components/collection-header";
import type { CollectionVisual } from "@/features/collections/types";
import type { ActionResult } from "@/lib/action";

const toDemo = (id: string) => `/dev/colecao/${id}` as Route;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Cabeçalho da coleção de exemplo com as ações de verdade e um servidor de
 * mentira: demora um pouco e, com o interruptor, falha de propósito.
 */
export function CollectionActionsDemo({
  collection: initial,
}: {
  collection: CollectionVisual;
}) {
  const id = useId();
  const [collection, setCollection] = useState(initial);
  const [like, setLike] = useState({ liked: false, count: initial.likeCount });
  const [saved, setSaved] = useState(false);
  const [failing, setFailing] = useState(false);

  async function respond<T>(data: T, delay = 300): Promise<ActionResult<T>> {
    await wait(delay);
    return failing ? { ok: false, error: "Sem conexão" } : { ok: true, data };
  }

  return (
    <div className="flex flex-col gap-6">
      <CollectionHeader
        collection={collection}
        collectionHref={toDemo}
        actions={
          <div
            role="group"
            aria-label="Ações da coleção"
            className="flex flex-wrap items-center gap-2"
          >
            <LikeButton
              liked={like.liked}
              count={like.count}
              onToggle={async (next) => {
                const result = await respond(undefined);
                if (result.ok) {
                  setLike((current) => ({
                    liked: next,
                    count: current.count + (next ? 1 : -1),
                  }));
                }
                return result;
              }}
            />
            <SaveButton
              saved={saved}
              onToggle={async (next) => {
                const result = await respond(undefined);
                if (result.ok) setSaved(next);
                return result;
              }}
            />
            <ShareButton
              path={toDemo(collection.id)}
              title={collection.title}
            />
            <CopyCollectionButton
              onCopy={() => respond({ id: collection.id }, 600)}
              hrefFor={toDemo}
            />
            <CollectionForm
              mode="edit"
              trigger={
                <Button variant="ghost" size="sm">
                  <PencilIcon className="size-4" />
                  Editar coleção
                </Button>
              }
              defaultValues={{
                title: collection.title,
                description: collection.description ?? "",
                emoji: collection.emoji ?? "",
                visibility: collection.visibility,
                isCollaborative: collection.isCollaborative,
              }}
              onSubmit={async (data) => {
                const result = await respond(undefined);
                if (result.ok) {
                  setCollection((current) => ({
                    ...current,
                    title: data.title,
                    description: data.description,
                    emoji: data.emoji,
                    visibility: data.visibility,
                    isCollaborative: data.isCollaborative,
                  }));
                  toast("Coleção salva");
                }
                return result;
              }}
            />
          </div>
        }
      />
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <Switch
          id={`${id}-erro`}
          checked={failing}
          onCheckedChange={setFailing}
        />
        <Label htmlFor={`${id}-erro`} className="font-normal">
          Simular erro nas ações
        </Label>
      </div>
    </div>
  );
}
