import { Vibrant } from "node-vibrant/node";
import sharp from "sharp";
import { COVER_FILES } from "./cover";

type Swatch = { hex: string } | null | undefined;

/** A paleta do node-vibrant, só com o que a escolha da cor lê. */
export type CoverPalette = Partial<
  Record<
    | "Vibrant"
    | "Muted"
    | "DarkVibrant"
    | "DarkMuted"
    | "LightVibrant"
    | "LightMuted",
    Swatch
  >
>;

const HEX_COLOR = /^#[0-9a-f]{6}$/;

/**
 * Cor da capa: a vibrante, depois a apagada e, por último, a vibrante escura
 * (a mesma ordem do seed). Sem nenhuma delas, null, e a interface usa a cor
 * gerada pelo título.
 */
export function pickCoverColor(palette: CoverPalette): string | null {
  for (const swatch of [palette.Vibrant, palette.Muted, palette.DarkVibrant]) {
    const hex = swatch?.hex.toLowerCase();
    if (hex && HEX_COLOR.test(hex)) return hex;
  }
  return null;
}

export type ProcessedCover = {
  color: string | null;
  files: { name: (typeof COVER_FILES)[number]["name"]; data: Buffer }[];
};

/**
 * A capa baixada vira as três larguras em WebP (nunca maiores que a original)
 * e dá a cor do livro. Arquivo que não é imagem vira null.
 */
export async function processCover(
  image: Buffer,
): Promise<ProcessedCover | null> {
  try {
    const files = await Promise.all(
      COVER_FILES.map(async ({ name, width }) => ({
        name,
        data: await sharp(image)
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer(),
      })),
    );
    // O node-vibrant (Jimp) não lê WebP, que é o que chega do cadastro: a cor
    // sai de uma cópia pequena em PNG
    const sample = await sharp(image)
      .resize({ width: 160, withoutEnlargement: true })
      .png()
      .toBuffer();
    const palette = await Vibrant.from(sample).getPalette();
    return { color: pickCoverColor(palette), files };
  } catch {
    return null;
  }
}
