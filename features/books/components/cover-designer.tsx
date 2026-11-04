"use client";

import { ImageUp, X } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { BookPreview3D } from "@/features/viewer-3d/components/book-preview-3d";
import { formatNumber } from "@/lib/format";
import {
  bookColor,
  contrastRatio,
  coverInk,
  generatedCoverColor,
  INK_RGB,
  PAPER_RGB,
  toHex,
} from "../lib/color";
import { COVER_PALETTE, normalizeHex } from "../lib/cover-palette";
import {
  COVER_STYLE_LABEL,
  COVER_STYLES,
  type CoverStyle,
} from "../lib/cover-style";
import { MAX_ORIGINAL_BYTES, shrinkImage } from "../lib/shrink-image";
import { spineHeight, spineWidth } from "../lib/spine";
import type { BookVisual } from "../types";
import { BookCover } from "./book-cover";
import { GeneratedCover } from "./generated-cover";
import { SpineArt, spineColors } from "./spine-art";

export type CoverImage =
  | { kind: "none" }
  /** A imagem que o livro já tem (na edição). */
  | { kind: "current"; url: string }
  /**
   * Escolhida agora: já reduzida, com uma URL local para a prévia e o tom
   * médio dela (a lombada da prévia, na cor automática; o servidor tira a
   * cor de verdade ao salvar).
   */
  | { kind: "new"; file: File; url: string; tone: string | null };

/** A capa sendo desenhada no cadastro ou na edição. */
export type CoverDraft = {
  /** null: a cor automática, derivada do título. */
  color: string | null;
  style: CoverStyle;
  image: CoverImage;
};

type DraftSetter = React.Dispatch<React.SetStateAction<CoverDraft>>;

/** O livro como a prévia o desenha: os dados do formulário e a capa escolhida. */
export function previewBook(
  base: Pick<BookVisual, "title" | "authors" | "pageCount" | "publishedYear">,
  draft: CoverDraft,
): BookVisual {
  return {
    id: "previa",
    ...base,
    coverUrl: draft.image.kind === "none" ? null : draft.image.url,
    coverColor:
      draft.color ?? (draft.image.kind === "new" ? draft.image.tone : null),
    coverStyle: draft.style,
  };
}

/** O tom médio da imagem, numa cópia de 8 × 8 (null se o navegador não ler). */
async function averageTone(file: Blob): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file, {
      resizeWidth: 8,
      resizeHeight: 8,
    });
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 8;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, 8, 8);
    bitmap.close();
    const { data } = context.getImageData(0, 0, 8, 8);
    const sum = [0, 0, 0];
    for (let index = 0; index < data.length; index += 4) {
      sum[0] += data[index] ?? 0;
      sum[1] += data[index + 1] ?? 0;
      sum[2] += data[index + 2] ?? 0;
    }
    return toHex(sum.map((channel) => Math.round(channel / 64)));
  } catch {
    return null;
  }
}

const PREVIEW_MODES = [
  { value: "capa", label: "Capa" },
  { value: "lombada", label: "Lombada" },
  { value: "3d", label: "3D" },
] as const;

type PreviewMode = (typeof PREVIEW_MODES)[number]["value"];

function SpinePreview({ book }: { book: BookVisual }) {
  const width = spineWidth(book.pageCount);
  return (
    <div
      role="img"
      aria-label={`Lombada de ${book.title}`}
      className="spine relative overflow-hidden rounded-cover bg-(--cover)"
      style={
        {
          width,
          height: spineHeight(book.id),
          "--cover": spineColors(book).background,
        } as React.CSSProperties
      }
    >
      <SpineArt book={book} width={width} />
    </div>
  );
}

/**
 * A prévia ao vivo da capa escolhida: a capa, a lombada ou o livro em 3D, na
 * mesma cor e no mesmo estilo. O quadro tem tamanho fixo, para o formulário
 * não pular quando a prévia muda.
 */
export function CoverPreview({ book }: { book: BookVisual }) {
  const [mode, setMode] = useState<PreviewMode>("capa");

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative grid h-60 w-40 place-items-center">
        {mode === "capa" ? (
          <BookCover book={book} size="md" tilt={false} />
        ) : mode === "lombada" ? (
          <SpinePreview book={book} />
        ) : (
          // Preso ao quadro: numa grade que se ajusta ao conteúdo, o canvas
          // ficaria com a largura padrão (300px) e o livro, fora do centro
          <BookPreview3D book={book} className="absolute inset-0" />
        )}
      </div>
      <SegmentedControl<PreviewMode>
        aria-label="Prévia da capa"
        size="sm"
        value={mode}
        onValueChange={setMode}
        options={PREVIEW_MODES}
      />
    </div>
  );
}

const sectionLabel =
  "font-mono text-[11px] tracking-wide text-muted-foreground uppercase";

/** Uma bolinha da paleta (ou a cor automática). */
function Swatch({
  value,
  color,
  label,
}: {
  value: string;
  color: string;
  label: string;
}) {
  return (
    <RadioGroupPrimitive.Item
      value={value}
      aria-label={label}
      title={label}
      style={{ "--cover": color } as React.CSSProperties}
      className="relative size-8 cursor-pointer rounded-full border border-border bg-(--cover) transition-transform hover:scale-105 data-[state=checked]:ring-2 data-[state=checked]:ring-foreground data-[state=checked]:ring-offset-2 data-[state=checked]:ring-offset-surface"
    />
  );
}

/**
 * O desenho da capa: a imagem (enviar, trocar ou tirar) e, sem imagem, o
 * estilo da capa tipográfica e a cor (a automática, uma das 12 da paleta ou
 * qualquer hex). O contraste do texto sai do coverInk, como na capa de
 * verdade: quando o tom não deixa o texto passar no AA, ele é ajustado, e o
 * aviso diz.
 */
export function CoverControls({
  book,
  draft,
  onChange,
}: {
  /** O livro da prévia (previewBook). */
  book: BookVisual;
  draft: CoverDraft;
  onChange: DraftSetter;
}) {
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const autoColor = generatedCoverColor(book.title);
  const [hexText, setHexText] = useState(draft.color ?? "");

  // A URL local da imagem escolhida vale enquanto ela está na prévia
  useEffect(() => {
    const image = draft.image;
    if (image.kind !== "new") return;
    return () => URL.revokeObjectURL(image.url);
  }, [draft.image]);

  async function chooseImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // A mesma imagem pode ser escolhida de novo depois de tirada
    event.target.value = "";
    if (!file) return;
    setImageError(null);
    if (file.size > MAX_ORIGINAL_BYTES) {
      setImageError("Essa imagem passa de 15 MB. Escolha uma menor.");
      return;
    }
    setReading(true);
    const small = await shrinkImage(file);
    setReading(false);
    if (!small) {
      setImageError("Não deu para ler essa imagem. Tente JPG, PNG ou WebP.");
      return;
    }
    const tone = await averageTone(small);
    // Imagem nova volta à cor automática: a lombada sai na cor dela
    setHexText("");
    onChange((current) => ({
      ...current,
      color: null,
      image: {
        kind: "new",
        file: small,
        url: URL.createObjectURL(small),
        tone,
      },
    }));
  }

  function chooseColor(color: string | null) {
    setHexText(color ?? "");
    onChange((current) => ({ ...current, color }));
  }

  function typeHex(text: string) {
    setHexText(text);
    const hex = normalizeHex(text);
    if (hex) onChange((current) => ({ ...current, color: hex }));
  }

  const hasImage = draft.image.kind !== "none";
  // Com imagem e a cor automática, a lombada é a cor dela (book.coverColor
  // traz o tom médio na prévia)
  const effective = bookColor({
    title: book.title,
    coverColor: draft.color ?? (hasImage ? book.coverColor : null),
  });
  const readable = coverInk(effective);
  const ratio = contrastRatio(
    readable.background,
    toHex(readable.ink === "ink" ? INK_RGB : PAPER_RGB),
  );
  const swatchValue =
    draft.color === null
      ? "auto"
      : COVER_PALETTE.some((swatch) => swatch.hex === draft.color)
        ? draft.color
        : "";
  const hexInvalid = hexText !== "" && normalizeHex(hexText) === null;

  return (
    <fieldset className="flex min-w-0 flex-col gap-5">
      <legend className="sr-only">Capa</legend>

      <div className="flex flex-col gap-2">
        <p className={sectionLabel}>Imagem da capa</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            tabIndex={-1}
            aria-hidden
            className="sr-only"
            onChange={chooseImage}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={reading}
            onClick={() => fileInput.current?.click()}
          >
            <ImageUp />
            {reading
              ? "Lendo a imagem…"
              : draft.image.kind === "none"
                ? "Enviar imagem"
                : "Trocar imagem"}
          </Button>
          {draft.image.kind !== "none" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                onChange((current) => ({ ...current, image: { kind: "none" } }))
              }
            >
              <X />
              Tirar imagem
            </Button>
          ) : null}
        </div>
        <div aria-live="polite">
          {imageError ? (
            <p className="text-xs text-destructive">{imageError}</p>
          ) : hasImage ? (
            <p className="text-xs text-pretty text-muted-foreground">
              A capa é a imagem. O estilo e a cor continuam valendo para a
              lombada; na cor automática, ela sai na cor da imagem.
            </p>
          ) : null}
        </div>
      </div>

      <>
        <div className="flex flex-col gap-2">
          <p id={`${id}-estilo`} className={sectionLabel}>
            {hasImage ? "Estilo da lombada" : "Estilo"}
          </p>
          <RadioGroupPrimitive.Root
            aria-labelledby={`${id}-estilo`}
            value={draft.style}
            onValueChange={(style) =>
              onChange((current) => ({
                ...current,
                style: style as CoverStyle,
              }))
            }
            orientation="horizontal"
            className="grid grid-cols-4 gap-2"
          >
            {COVER_STYLES.map((style) => (
              <RadioGroupPrimitive.Item
                key={style}
                value={style}
                className="group/estilo flex cursor-pointer flex-col items-center gap-1.5 rounded-control p-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground data-[state=checked]:bg-muted data-[state=checked]:text-foreground"
              >
                <span
                  aria-hidden
                  className="relative aspect-2/3 w-full max-w-14 overflow-hidden rounded-cover bg-(--cover) ring-1 ring-border group-data-[state=checked]/estilo:ring-2 group-data-[state=checked]/estilo:ring-foreground"
                  style={
                    { "--cover": readable.background } as React.CSSProperties
                  }
                >
                  <GeneratedCover
                    book={{ ...book, coverUrl: null, coverStyle: style }}
                    ink={readable.ink}
                  />
                </span>
                {COVER_STYLE_LABEL[style]}
              </RadioGroupPrimitive.Item>
            ))}
          </RadioGroupPrimitive.Root>
        </div>

        <div className="flex flex-col gap-2">
          <p id={`${id}-cor`} className={sectionLabel}>
            {hasImage ? "Cor da lombada" : "Cor"}
          </p>
          <RadioGroupPrimitive.Root
            aria-labelledby={`${id}-cor`}
            value={swatchValue}
            onValueChange={(value) =>
              chooseColor(value === "auto" ? null : value)
            }
            orientation="horizontal"
            className="flex flex-wrap gap-2 p-1"
          >
            <Swatch
              value="auto"
              color={hasImage ? effective : autoColor}
              label={
                hasImage ? "Automática, pela imagem" : "Automática, pelo título"
              }
            />
            {COVER_PALETTE.map((swatch) => (
              <Swatch
                key={swatch.hex}
                value={swatch.hex}
                color={swatch.hex}
                label={swatch.name}
              />
            ))}
          </RadioGroupPrimitive.Root>
          <div className="flex flex-wrap items-center gap-2">
            <label
              // O campo nativo fica invisível por cima: o contorno de foco
              // vai na moldura
              className="relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-control border border-input bg-(--cover) has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
              style={{ "--cover": effective } as React.CSSProperties}
            >
              <span className="sr-only">Escolher outra cor</span>
              <input
                type="color"
                value={effective}
                onChange={(event) => chooseColor(event.target.value)}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              />
            </label>
            <Input
              aria-label="Cor em hexadecimal"
              aria-invalid={hexInvalid || undefined}
              placeholder={autoColor}
              value={hexText}
              onChange={(event) => typeHex(event.target.value)}
              spellCheck={false}
              autoComplete="off"
              className="w-28 font-mono"
            />
          </div>
          <p
            aria-live="polite"
            className="text-xs text-pretty text-muted-foreground"
          >
            Texto em tinta {readable.ink === "ink" ? "escura" : "clara"},
            contraste de {formatNumber(Math.round(ratio * 10) / 10)}:1 (AA).
            {readable.background !== effective
              ? " O tom foi ajustado um pouco para o texto ficar legível."
              : null}
          </p>
        </div>
      </>
    </fieldset>
  );
}
