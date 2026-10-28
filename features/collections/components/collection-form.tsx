"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { GlobeIcon, LockIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action";
import { springs, tweens } from "@/lib/motion";
import { useMediaQuery } from "@/lib/use-media-query";
import {
  COLLECTION_LIMITS,
  type CollectionFormData,
  type CollectionFormValues,
  collectionFormSchema,
} from "../schemas";
import type { Person } from "../types";
import { EmojiPicker } from "./emoji-picker";

const visibilityOptions = [
  { value: "public", label: "Pública", icon: GlobeIcon },
  { value: "private", label: "Privada", icon: LockIcon },
] as const;

// O formato do @ (o mesmo do banco); se a pessoa existe, quem diz é o servidor
const USERNAME = /^[a-z0-9_]{3,20}$/;

export type CollectionFormSubmit = CollectionFormData & {
  /** @ convidados agora. */
  invites: string[];
  /** @ de quem colaborava e foi tirado no formulário. */
  removed: string[];
};

type CollectionFormProps = {
  /** O botão que abre o formulário; o foco volta para ele ao fechar. */
  trigger: React.ReactElement;
  mode: "create" | "edit";
  defaultValues?: Partial<CollectionFormValues>;
  /** Quem já colabora (ao editar). */
  members?: Person[];
  onSubmit: (data: CollectionFormSubmit) => Promise<ActionResult<unknown>>;
};

// O @ existe? O mesmo endpoint do cadastro: "taken" é de outra pessoa. Sem
// resposta, o servidor confere no salvar
async function usernameStatus(username: string) {
  try {
    const response = await fetch(
      `/api/usernames/availability?username=${encodeURIComponent(username)}`,
    );
    const body = (await response.json()) as { status?: string };
    return body.status ?? null;
  } catch {
    return null;
  }
}

/**
 * Criar ou editar uma coleção, numa gaveta (spec §5.8): título, descrição,
 * emoji, quem vê e a opção colaborativa, que revela o convite por @.
 */
export function CollectionForm({
  trigger,
  mode,
  defaultValues,
  members,
  onSubmit,
}: CollectionFormProps) {
  const [open, setOpen] = useState(false);
  const wide = useMediaQuery("(min-width: 640px)");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side={wide ? "right" : "bottom"}
        className="overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>
            {mode === "create" ? "Nova coleção" : "Editar coleção"}
          </SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? "Junte livros que conversam entre si."
              : "Mude o que quiser; os livros continuam onde estão."}
          </SheetDescription>
        </SheetHeader>
        {/* Monta de novo a cada abertura, com os valores de agora */}
        <CollectionFields
          mode={mode}
          defaultValues={defaultValues}
          members={members}
          onSubmit={onSubmit}
          onDone={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  ) : null;
}

function CollectionFields({
  mode,
  defaultValues,
  members = [],
  onSubmit,
  onDone,
}: Omit<CollectionFormProps, "trigger"> & { onDone: () => void }) {
  const id = useId();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CollectionFormValues, unknown, CollectionFormData>({
    resolver: zodResolver(collectionFormSchema),
    defaultValues: {
      title: "",
      description: "",
      emoji: "",
      visibility: "public",
      isCollaborative: false,
      ...defaultValues,
    },
  });
  const collaborative = useWatch({ control, name: "isCollaborative" });
  const visibility = useWatch({ control, name: "visibility" });
  const [invites, setInvites] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const errorId = (field: string) => `${id}-${field}-erro`;
  const staying = members.filter(
    (member) => !removed.includes(member.username),
  );

  async function submit(data: CollectionFormData) {
    setServerError(null);
    const result = await onSubmit({
      ...data,
      invites: data.isCollaborative ? invites : [],
      removed,
    });
    if (result.ok) {
      onDone();
      return;
    }
    const fields = Object.entries(result.fieldErrors ?? {});
    for (const [field, message] of fields) {
      setError(field as keyof CollectionFormValues, { message });
    }
    if (fields.length === 0) setServerError(result.error);
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-titulo`}>Título</Label>
        <Input
          id={`${id}-titulo`}
          autoComplete="off"
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? errorId("titulo") : undefined}
          {...register("title")}
        />
        <FieldError id={errorId("titulo")} message={errors.title?.message} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-descricao`}>
          Descrição{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          id={`${id}-descricao`}
          rows={3}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={
            errors.description ? errorId("descricao") : undefined
          }
          {...register("description")}
        />
        <FieldError
          id={errorId("descricao")}
          message={errors.description?.message}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p id={`${id}-emoji`} className="text-sm font-medium">
          Emoji
        </p>
        <Controller
          control={control}
          name="emoji"
          render={({ field }) => (
            <EmojiPicker
              value={field.value}
              onChange={field.onChange}
              labelledBy={`${id}-emoji`}
              invalid={Boolean(errors.emoji)}
              errorId={errors.emoji ? errorId("emoji") : undefined}
            />
          )}
        />
        <FieldError id={errorId("emoji")} message={errors.emoji?.message} />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Quem vê</p>
        <Controller
          control={control}
          name="visibility"
          render={({ field }) => (
            <SegmentedControl
              aria-label="Visibilidade"
              value={field.value}
              onValueChange={field.onChange}
              options={visibilityOptions}
              className="self-start"
            />
          )}
        />
        <p className="text-xs text-muted-foreground">
          {visibility === "private"
            ? "Só você e quem colabora."
            : "Qualquer pessoa com o link."}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${id}-colaborativa`}>Colaborativa</Label>
            <p className="text-xs text-muted-foreground">
              Quem você convidar também adiciona e reordena os livros.
            </p>
          </div>
          <Controller
            control={control}
            name="isCollaborative"
            render={({ field }) => (
              <Switch
                id={`${id}-colaborativa`}
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </div>
        <AnimatePresence initial={false} mode="popLayout">
          {collaborative ? (
            <motion.div
              key="convites"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: springs.smooth }}
              exit={{ opacity: 0, transition: tweens.fast }}
            >
              <InviteField
                invites={invites}
                onChange={setInvites}
                members={staying.map((member) => member.username)}
                onRemoveMember={(username) =>
                  setRemoved((current) => [...current, username])
                }
              />
            </motion.div>
          ) : staying.length > 0 ? (
            <motion.p
              key="aviso"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: springs.smooth }}
              exit={{ opacity: 0, transition: tweens.fast }}
              className="text-xs text-pretty text-muted-foreground"
            >
              Ao salvar,{" "}
              {staying.map((member) => `@${member.username}`).join(", ")}{" "}
              {staying.length === 1 ? "deixa" : "deixam"} de colaborar.
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      {serverError ? (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      ) : null}

      {/* O botão desce com mola quando o convite aparece */}
      <motion.div layout="position" transition={springs.smooth}>
        <SheetFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Salvando…"
              : mode === "create"
                ? "Criar coleção"
                : "Salvar mudanças"}
          </Button>
        </SheetFooter>
      </motion.div>
    </form>
  );
}

function Chip({
  username,
  label,
  onRemove,
}: {
  username: string;
  label: string;
  onRemove: () => void;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: tweens.fast }}
      transition={springs.snappy}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted py-0.5 pr-1 pl-2.5 text-sm"
    >
      @{username}
      <button
        type="button"
        aria-label={label}
        onClick={onRemove}
        className="cursor-pointer rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <XIcon className="size-3.5" />
      </button>
    </motion.li>
  );
}

function InviteField({
  invites,
  onChange,
  members,
  onRemoveMember,
}: {
  invites: string[];
  onChange: (invites: string[]) => void;
  /** Quem já colabora (sai ao salvar, se tirado aqui). */
  members: string[];
  onRemoveMember: (username: string) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function add() {
    const username = draft.trim().replace(/^@/, "").toLowerCase();
    if (!USERNAME.test(username)) {
      setError("Use de 3 a 20 letras, números ou _");
      return;
    }
    if (invites.includes(username)) {
      setError("Essa pessoa já está na lista");
      return;
    }
    if (members.includes(username)) {
      setError(`@${username} já colabora`);
      return;
    }
    if (invites.length + members.length >= COLLECTION_LIMITS.members) {
      setError(`Até ${COLLECTION_LIMITS.members} pessoas por coleção`);
      return;
    }
    setChecking(true);
    const status = await usernameStatus(username);
    setChecking(false);
    if (status === "yours") {
      setError("Esse @ é o seu");
    } else if (status !== null && status !== "taken") {
      setError(`Não achamos @${username}`);
    } else {
      onChange([...invites, username]);
      setDraft("");
      setError(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {members.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Colaboram</p>
          <ul aria-label="Colaboradores" className="flex flex-wrap gap-1.5">
            <AnimatePresence initial={false}>
              {members.map((username) => (
                <Chip
                  key={username}
                  username={username}
                  label={`Tirar @${username} da coleção`}
                  onRemove={() => onRemoveMember(username)}
                />
              ))}
            </AnimatePresence>
          </ul>
        </div>
      ) : null}
      <Label htmlFor={`${id}-convite`}>Convidar por @</Label>
      <div className="flex gap-2">
        <Input
          id={`${id}-convite`}
          value={draft}
          placeholder="@usuario"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-erro` : undefined}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            // Enter convida, sem enviar o formulário
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={add}
          disabled={checking}
          aria-busy={checking || undefined}
        >
          Convidar
        </Button>
      </div>
      <FieldError id={`${id}-erro`} message={error ?? undefined} />
      {invites.length > 0 ? (
        <ul aria-label="Convidados" className="flex flex-wrap gap-1.5">
          <AnimatePresence initial={false}>
            {invites.map((username) => (
              <Chip
                key={username}
                username={username}
                label={`Tirar @${username}`}
                onRemove={() =>
                  onChange(invites.filter((invite) => invite !== username))
                }
              />
            ))}
          </AnimatePresence>
        </ul>
      ) : null}
    </div>
  );
}
