// Gera os ícones do app (manifest, Apple) e as telas de abertura do iPhone e
// do iPad em public/pwa. Roda à mão quando o logo ou as cores mudarem:
// npm run pwa:icones. As cores vêm dos tokens do globals.css.
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
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
  await png("icone-192.png", <Icon size={192} scale={0.62} />, 192);
  await png("icone-512.png", <Icon size={512} scale={0.62} />, 512);
  // Maskable: o sistema pode recortar até um círculo de 80%; as lombadas
  // ficam dentro dele
  await png("icone-maskable-512.png", <Icon size={512} scale={0.46} />, 512);
  await png("apple-icon-180.png", <Icon size={180} scale={0.56} />, 180);

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
