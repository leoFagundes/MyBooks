"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { SwapText } from "@/components/motion/swap-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useMediaQuery } from "@/lib/use-media-query";
import { updateProfile } from "../actions";
import type { ProfileSummary } from "../queries";
import type { Genre } from "../lib/genre-name";
import { editProfileSchema } from "../schemas";
import { GenreChips } from "./genre-chips";
import { type AvatarValue, AvatarPicker } from "./onboarding/avatar-picker";

const fieldsSchema = editProfileSchema.omit({ avatarPath: true });
type Fields = z.input<typeof fieldsSchema>;
type ParsedFields = z.output<typeof fieldsSchema>;
type FieldName = keyof Fields;

const BIO_MAX = 160;

const PRIVACY = [
  { value: "publico", label: "Todo mundo" },
  { value: "privado", label: "Só quem eu aprovar" },
] as const;

type EditableProfile = Pick<
  ProfileSummary,
  "id" | "displayName" | "bio" | "avatarUrl" | "favoriteGenres" | "isPrivate"
>;

/**
 * "Editar perfil": nome, bio, foto, gêneros e privacidade, com as mesmas
 * peças do onboarding. Gaveta de baixo no celular e lateral no resto.
 */
export function EditProfileSheet({
  profile,
  genres,
}: {
  profile: EditableProfile;
  /** Os favoritos com nome, inclusive os criados e ainda em análise. */
  genres: Genre[];
}) {
  const wide = useMediaQuery("(min-width: 640px)");
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">Editar perfil</Button>
      </SheetTrigger>
      <SheetContent
        side={wide ? "right" : "bottom"}
        aria-describedby={undefined}
      >
        <SheetHeader>
          <SheetTitle>Editar perfil</SheetTitle>
        </SheetHeader>
        <EditProfileForm
          profile={profile}
          genres={genres}
          onSaved={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

function EditProfileForm({
  profile,
  genres,
  onSaved,
}: {
  profile: EditableProfile;
  genres: Genre[];
  onSaved: () => void;
}) {
  const id = useId();
  const [avatar, setAvatar] = useState<AvatarValue>({
    path: null,
    preview: profile.avatarUrl,
  });
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setError,
    formState: { errors },
  } = useForm<Fields, unknown, ParsedFields>({
    resolver: zodResolver(fieldsSchema),
    defaultValues: {
      displayName: profile.displayName,
      bio: profile.bio ?? "",
      genres: genres.map((genre) => genre.slug),
      isPrivate: profile.isPrivate,
    },
  });
  const name = useWatch({ control, name: "displayName" });
  const bio = useWatch({ control, name: "bio" });
  const isPrivate = useWatch({ control, name: "isPrivate" });

  const submit = handleSubmit(() => {
    setServerError(null);
    startSaving(async () => {
      // O servidor confere de novo, a partir do que está no formulário
      const result = await updateProfile({
        ...getValues(),
        avatarPath: avatar.path,
      });
      if (result.ok) {
        toast.success("Perfil atualizado");
        onSaved();
        return;
      }
      const fields = Object.entries(result.fieldErrors ?? {});
      for (const [field, message] of fields) {
        if (field in fieldsSchema.shape) {
          setError(field as FieldName, { message });
        }
      }
      if (fields.length === 0) setServerError(result.error);
    });
  });

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      {/* Só os campos rolam; os botões ficam à vista */}
      <div className="-mx-6 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-6 py-1">
        <AvatarPicker
          userId={profile.id}
          name={name || profile.displayName}
          value={avatar}
          onChange={setAvatar}
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-nome`}>Nome</Label>
          <Input
            id={`${id}-nome`}
            autoComplete="name"
            aria-invalid={errors.displayName ? true : undefined}
            aria-describedby={
              errors.displayName ? `${id}-nome-erro` : undefined
            }
            {...register("displayName")}
          />
          {errors.displayName ? (
            <p id={`${id}-nome-erro`} className="text-xs text-destructive">
              {errors.displayName.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor={`${id}-bio`}>Bio</Label>
            <span
              aria-hidden
              className="font-mono text-xs text-muted-foreground"
            >
              {(bio ?? "").length}/{BIO_MAX}
            </span>
          </div>
          <Textarea
            id={`${id}-bio`}
            rows={3}
            maxLength={BIO_MAX}
            placeholder="O que você anda lendo, ou como você lê"
            aria-invalid={errors.bio ? true : undefined}
            aria-describedby={errors.bio ? `${id}-bio-erro` : undefined}
            {...register("bio")}
          />
          {errors.bio ? (
            <p id={`${id}-bio-erro`} className="text-xs text-destructive">
              {errors.bio.message}
            </p>
          ) : null}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">
            Gêneros favoritos
          </legend>
          <Controller
            control={control}
            name="genres"
            render={({ field }) => (
              <GenreChips
                value={field.value}
                onChange={field.onChange}
                known={genres}
              />
            )}
          />
        </fieldset>

        <div className="flex flex-col gap-2">
          <span aria-hidden className="text-sm font-medium">
            Quem vê sua estante
          </span>
          <Controller
            control={control}
            name="isPrivate"
            render={({ field }) => (
              <SegmentedControl
                aria-label="Quem vê sua estante"
                options={PRIVACY}
                value={field.value ? "privado" : "publico"}
                onValueChange={(value) => field.onChange(value === "privado")}
              />
            )}
          />
          <p className="text-xs text-pretty text-muted-foreground">
            {isPrivate
              ? "Quem quiser ver a estante, as coleções e as citações pede para seguir, e você aprova."
              : "Qualquer pessoa vê sua estante, suas coleções e suas citações."}
          </p>
        </div>
      </div>

      {serverError ? (
        <p role="alert" className="text-xs text-destructive">
          {serverError}
        </p>
      ) : null}

      <SheetFooter className="flex-row justify-end">
        <SheetClose asChild>
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </SheetClose>
        <Button type="submit" disabled={saving} aria-busy={saving}>
          <SwapText text={saving ? "Salvando…" : "Salvar"} />
        </Button>
      </SheetFooter>
    </form>
  );
}
