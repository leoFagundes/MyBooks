// As capturas de tela do manifest (a janela de instalar do Chrome mostra):
// uma estreita, do celular, e uma larga. Roda com o app no ar, de preferência
// o build de produção: npm run pwa:capturas -- http://localhost:3100
import path from "node:path";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3000";
const out = path.join(process.cwd(), "public/pwa");

const browser = await chromium.launch();
const shots = [
  {
    file: "captura-estreita.png",
    route: "/@ana",
    width: 390,
    height: 844,
    scale: 2,
  },
  {
    file: "captura-larga.png",
    route: "/explorar",
    width: 1920,
    height: 1080,
    scale: 1,
  },
];
for (const shot of shots) {
  const page = await browser.newPage({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: shot.scale,
    reducedMotion: "reduce",
  });
  await page.goto(`${base}${shot.route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, shot.file) });
  await page.close();
}
await browser.close();
console.log("Capturas do manifest em public/pwa.");
