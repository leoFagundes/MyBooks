"use client";

import { useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { initials } from "@/lib/initials";
import { createClient } from "@/lib/supabase/client";
import {
  type CropArea,
  cropToSquare,
  extensionFor,
} from "../../lib/crop-image";

export type AvatarValue = {
  /** Caminho no bucket da foto nova; null quando a pessoa não trocou. */
  path: string | null;
  preview: string | null;
};

const ACCEPTED = "image/png,image/jpeg,image/webp";

/** Foto do perfil: escolher, recortar num quadrado e subir para avatars/<id>/. */
export function AvatarPicker({
  userId,
  name,
  value,
  onChange,
}: {
  userId: string;
  name: string;
  value: AvatarValue;
  onChange: (value: AvatarValue) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<CropArea | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ACCEPTED.split(",").includes(file.type)) {
      setError("Use uma foto em JPG, PNG ou WebP.");
      return;
    }
    setError(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setSource(URL.createObjectURL(file));
  }

  function close() {
    if (source) URL.revokeObjectURL(source);
    setSource(null);
  }

  async function confirm() {
    if (!source || !area) return;
    setUploading(true);
    try {
      const blob = await cropToSquare(source, area);
      const file = `${Date.now()}.${extensionFor(blob.type)}`;
      const { error: uploadError } = await createClient()
        .storage.from("avatars")
        .upload(`${userId}/${file}`, blob, {
          contentType: blob.type,
          cacheControl: "31536000",
        });
      if (uploadError) throw uploadError;
      onChange({
        path: `avatars/${userId}/${file}`,
        preview: URL.createObjectURL(blob),
      });
      close();
    } catch {
      setError("Não deu para enviar a foto. Tente outra.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-16">
        {value.preview ? <AvatarImage src={value.preview} alt="" /> : null}
        <AvatarFallback className="text-base">
          {initials(name || "?")}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-start gap-1.5">
        <Button
          ref={buttonRef}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          {value.preview ? "Trocar foto" : "Escolher foto"}
        </Button>
        {/* O botão é quem recebe foco e clique; o input só abre o seletor */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          onChange={choose}
        />
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Opcional. JPG, PNG ou WebP.
          </p>
        )}
      </div>

      <Dialog open={source !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent
          // Aberto sem DialogTrigger: o foco volta ao botão à mão
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            buttonRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Ajuste sua foto</DialogTitle>
            <DialogDescription>
              Arraste para centralizar e use o zoom.
            </DialogDescription>
          </DialogHeader>
          <div className="relative h-72 overflow-hidden rounded-card bg-muted">
            {source ? (
              <Cropper
                image={source}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setArea(pixels)}
              />
            ) : null}
          </div>
          <label className="flex items-center gap-3 text-sm">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="flex-1 accent-foreground"
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirm}
              disabled={uploading || !area}
              aria-busy={uploading}
            >
              {uploading ? "Enviando…" : "Usar esta foto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
