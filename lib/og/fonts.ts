import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// TTF estáticas do Google Fonts (OFL em assets/fonts/OFL.txt): o next/og não
// lê woff2. Lidas uma vez, quando o módulo carrega
const file = (name: string) =>
  readFile(join(process.cwd(), "assets/fonts", name));

const [serif, serifItalic, sans, sansMedium, mono] = await Promise.all([
  file("InstrumentSerif-Regular.ttf"),
  file("InstrumentSerif-Italic.ttf"),
  file("Geist-Regular.ttf"),
  file("Geist-Medium.ttf"),
  file("GeistMono-Regular.ttf"),
]);

/** As fontes do MyBooks para o ImageResponse. */
export const ogFonts = [
  { name: "Instrument Serif", data: serif, weight: 400, style: "normal" },
  { name: "Instrument Serif", data: serifItalic, weight: 400, style: "italic" },
  { name: "Geist", data: sans, weight: 400, style: "normal" },
  { name: "Geist", data: sansMedium, weight: 500, style: "normal" },
  { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
] as const;
