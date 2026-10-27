import sharp from "sharp";
import { describe, expect, test } from "vitest";
import { pickCoverColor, processCover } from "./cover-pipeline";

const swatch = (hex: string) => ({ hex });

describe("pickCoverColor", () => {
  test("a cor vibrante da capa vem primeiro", () => {
    expect(
      pickCoverColor({ Vibrant: swatch("#d9541e"), Muted: swatch("#6b705c") }),
    ).toBe("#d9541e");
  });

  test("sem vibrante, a apagada; sem as duas, a vibrante escura", () => {
    expect(pickCoverColor({ Vibrant: null, Muted: swatch("#6b705c") })).toBe(
      "#6b705c",
    );
    expect(
      pickCoverColor({
        Vibrant: null,
        Muted: null,
        DarkVibrant: swatch("#2b2d42"),
      }),
    ).toBe("#2b2d42");
  });

  test("o hex sai minúsculo, no formato do banco", () => {
    expect(pickCoverColor({ Vibrant: swatch("#D9541E") })).toBe("#d9541e");
  });

  test("sem nenhuma dessas, null (a capa usa a cor gerada pelo título)", () => {
    expect(pickCoverColor({})).toBeNull();
    expect(
      pickCoverColor({
        Vibrant: null,
        Muted: null,
        DarkVibrant: null,
        LightMuted: swatch("#eeeeee"),
      }),
    ).toBeNull();
  });
});

async function jpeg(width: number, height: number) {
  // Metade de cima em vermelho e de baixo em azul, para o Vibrant ter o que achar
  const top = await sharp({
    create: { width, height: height / 2, channels: 3, background: "#c0392b" },
  })
    .png()
    .toBuffer();
  return sharp({
    create: { width, height, channels: 3, background: "#1d3557" },
  })
    .composite([{ input: top, top: 0, left: 0 }])
    .jpeg()
    .toBuffer();
}

describe("processCover", () => {
  test("três larguras em WebP, sem aumentar a imagem, e a cor da capa", async () => {
    const cover = await processCover(await jpeg(333, 500));
    expect(cover?.files.map((file) => file.name)).toEqual(["S", "M", "L"]);
    const metadata = await Promise.all(
      (cover?.files ?? []).map((file) => sharp(file.data).metadata()),
    );
    expect(metadata.map((meta) => meta.format)).toEqual([
      "webp",
      "webp",
      "webp",
    ]);
    expect(metadata.map((meta) => meta.width)).toEqual([96, 240, 333]);
    expect(cover?.color).toMatch(/^#[0-9a-f]{6}$/);
  });

  test("capa grande desce até 480 de largura", async () => {
    const cover = await processCover(await jpeg(800, 1200));
    const large = cover?.files.find((file) => file.name === "L");
    expect((await sharp(large?.data).metadata()).width).toBe(480);
  });

  test("arquivo que não é imagem vira null", async () => {
    expect(await processCover(Buffer.from("não é uma imagem"))).toBeNull();
  });
});
