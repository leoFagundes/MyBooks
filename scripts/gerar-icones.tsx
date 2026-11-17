// Gera os ícones do app (manifest, Apple), as telas de abertura do iPhone e
// do iPad em public/pwa e o favicon (app/icon.svg e app/favicon.ico). Roda à
// mão quando o logo ou as cores mudarem: npm run pwa:icones. As cores vêm dos
// tokens do globals.css.
import { readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

const root = process.cwd();
const out = path.join(root, "public/pwa");
const css = readFileSync(path.join(root, "app/globals.css"), "utf8");

function token(name: string, selector: RegExp) {
  const block = selector.exec(css)?.[1] ?? "";
  const value = new RegExp(`${name}:\\s*([^;]+);`).exec(block)?.[1]?.trim();
  if (!value) throw new Error(`O token ${name} sumiu do globals.css`);
  return value;
}

const LIGHT = /:root,\s*\[data-theme="light"\]\s*\{([^}]*)\}/;
const DARK = /\[data-theme="dark"\]\s*\{([^}]*)\}/;
const themes = {
  claro: {
    background: token("--background", LIGHT),
    ink: token("--foreground", LIGHT),
  },
  escuro: {
    background: token("--background", DARK),
    ink: token("--foreground", DARK),
  },
};
// O ícone é invertido, como o botão primário: lombadas claras no preto
const icon = {
  background: themes.escuro.background,
  ink: themes.claro.background,
};

const serif = readFileSync(
  path.join(root, "assets/fonts/InstrumentSerif-Regular.ttf"),
);

/** As três lombadas do logo (components/shell/logo.tsx), em `size` px. */
function Spines({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20">
      <rect x="2.5" y="5" width="3.5" height="12" rx="1" fill={color} />
      <rect
        x="7.75"
        y="2.5"
        width="3.5"
        height="14.5"
        rx="1"
        fill={color}
        opacity="0.5"
      />
      <rect
        x="13.4"
        y="6"
        width="3.5"
        height="11"
        rx="1"
        fill={color}
        transform="rotate(10 15.15 11.5)"
      />
    </svg>
  );
}

async function png(
  file: string,
  element: React.ReactElement,
  width: number,
  height = width,
) {
  const image = new ImageResponse(element, {
    width,
    height,
    fonts: [{ name: "Instrument Serif", data: serif, style: "normal" }],
  });
  await writeFile(path.join(out, file), Buffer.from(await image.arrayBuffer()));
}

// O favicon: as três lombadas num ladrilho de cantos redondos, desenhadas
// numa grade de 32 (16 no menor), com as bordas no pixel. A terceira se apoia
// na quina de baixo, inclinada para fora, como no logo
type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
  faded?: boolean;
  /** O giro, em graus, em volta da quina de baixo à direita. */
  lean?: number;
};

const FAVICON_GRID: Record<16 | 32, { radius: number; spines: Rect[] }> = {
  32: {
    radius: 7,
    spines: [
      { x: 5, y: 11, width: 5, height: 14 },
      { x: 12, y: 7, width: 5, height: 18, faded: true },
      { x: 19, y: 12, width: 5, height: 13, lean: 12 },
    ],
  },
  // No menor, a grade é a dos pixels: lombadas de 3, vãos de 1 a 2
  16: {
    radius: 3.5,
    spines: [
      { x: 2, y: 5, width: 3, height: 8 },
      { x: 6, y: 3, width: 3, height: 10, faded: true },
      { x: 10, y: 6, width: 3, height: 7, lean: 12 },
    ],
  },
};

/** As lombadas; `paint` é o atributo da cor (um fill, ou a classe do tema). */
function faviconSpines(grid: 16 | 32, paint: string) {
  return FAVICON_GRID[grid].spines
    .map((spine) => {
      const corner = grid === 16 ? 0.75 : 1.25;
      const lean = spine.lean
        ? ` transform="rotate(${spine.lean} ${spine.x + spine.width} ${spine.y + spine.height})"`
        : "";
      const opacity = spine.faded ? ` opacity="0.5"` : "";
      return `<rect x="${spine.x}" y="${spine.y}" width="${spine.width}" height="${spine.height}" rx="${corner}" ${paint}${opacity}${lean}/>`;
    })
    .join("");
}

/** O favicon como SVG, num tema só (as cores do ladrilho e das lombadas). */
function faviconSvg(grid: 16 | 32, tile: string, ink: string) {
  const { radius } = FAVICON_GRID[grid];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${grid} ${grid}"><rect width="${grid}" height="${grid}" rx="${radius}" fill="${tile}"/>${faviconSpines(grid, `fill="${ink}"`)}</svg>`;
}

/**
 * O SVG que os navegadores de hoje usam: ladrilho escuro com lombadas claras
 * no tema claro e o contrário no escuro, como o botão primário.
 */
function adaptiveFavicon() {
  const { radius } = FAVICON_GRID[32];
  const spines = faviconSpines(32, 'class="lombada"');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<style>
.ladrilho { fill: ${themes.claro.ink}; }
.lombada { fill: ${themes.claro.background}; }
@media (prefers-color-scheme: dark) {
  .ladrilho { fill: ${themes.escuro.ink}; }
  .lombada { fill: ${themes.escuro.background}; }
}
</style>
<rect class="ladrilho" width="32" height="32" rx="${radius}"/>${spines}
</svg>
`;
}

async function faviconPng(size: number) {
  const grid = size <= 16 ? 16 : 32;
  const svg = faviconSvg(grid, themes.claro.ink, themes.claro.background);
  const image = new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`}
      width={size}
      height={size}
      alt=""
    />,
    { width: size, height: size },
  );
  return Buffer.from(await image.arrayBuffer());
}

/** Um .ico com PNGs dentro (o formato que todo navegador lê desde o Vista). */
function ico(images: { size: number; data: Buffer }[]) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]);
}

async function favicon() {
  await writeFile(path.join(root, "app/icon.svg"), adaptiveFavicon());
  const sizes = [16, 32, 48];
  const images = await Promise.all(
    sizes.map(async (size) => ({ size, data: await faviconPng(size) })),
  );
  await writeFile(path.join(root, "app/favicon.ico"), ico(images));
  // Para conferir de perto (fora do git)
  for (const { size, data } of images) {
    await writeFile(path.join(root, `test-results/favicon-${size}.png`), data);
  }
}

/** Ícone quadrado; `scale` é a fração ocupada pelas lombadas. */
function Icon({ size, scale }: { size: number; scale: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: icon.background,
      }}
    >
      <Spines size={Math.round(size * scale)} color={icon.ink} />
    </div>
  );
}

// Retrato, em px CSS, com a densidade: os aparelhos mais comuns
const SPLASH: [number, number, number][] = [
  [440, 956, 3],
  [430, 932, 3],
  [428, 926, 3],
  [402, 874, 3],
  [393, 852, 3],
  [390, 844, 3],
  [375, 812, 3],
  [414, 896, 2],
  [375, 667, 2],
  [1024, 1366, 2],
  [834, 1194, 2],
  [820, 1180, 2],
  [810, 1080, 2],
  [744, 1133, 2],
];

function Splash({
  width,
  height,
  theme,
}: {
  width: number;
  height: number;
  theme: (typeof themes)["claro"];
}) {
  const unit = Math.min(width, height);
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: unit * 0.04,
        background: theme.background,
        color: theme.ink,
      }}
    >
      <Spines size={Math.round(unit * 0.22)} color={theme.ink} />
      <div
        style={{
          fontFamily: "Instrument Serif",
          fontSize: unit * 0.11,
          letterSpacing: "-0.02em",
        }}
      >
        MyBooks
      </div>
    </div>
  );
}

async function main() {
  await mkdir(out, { recursive: true });
  await mkdir(path.join(root, "test-results"), { recursive: true });
  await favicon();
  await png("icone-192.png", <Icon size={192} scale={0.62} />, 192);
  await png("icone-512.png", <Icon size={512} scale={0.62} />, 512);
  // Maskable: o sistema pode recortar até um círculo de 80%; as lombadas
  // ficam dentro dele
  await png("icone-maskable-512.png", <Icon size={512} scale={0.46} />, 512);
  // O ícone da Apple é convenção de arquivo do Next (app/apple-icon.png): com
  // `icons` no metadata do layout, o Next deixaria de pôr o app/icon.svg
  await png("apple-icon-180.png", <Icon size={180} scale={0.56} />, 180);
  await rename(
    path.join(out, "apple-icon-180.png"),
    path.join(root, "app/apple-icon.png"),
  );

  for (const [cssWidth, cssHeight, ratio] of SPLASH) {
    const width = cssWidth * ratio;
    const height = cssHeight * ratio;
    for (const [name, theme] of Object.entries(themes)) {
      await png(
        `abertura-${width}x${height}-${name}.png`,
        <Splash width={width} height={height} theme={theme} />,
        width,
        height,
      );
    }
  }

  // O layout monta as tags da Apple com a mesma lista
  await writeFile(
    path.join(root, "features/pwa/splash-screens.json"),
    `${JSON.stringify(SPLASH, null, 2)}\n`,
  );
  console.log(`Ícones e ${SPLASH.length * 2} telas de abertura em public/pwa.`);
}

void main();
