import type { MetadataRoute } from "next";
import { themeColors } from "@/lib/og/theme";

// Instalar o app (MELHORIAS 9.1). Os ícones e as capturas ficam em public/pwa
// (npm run pwa:icones e npm run pwa:capturas).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MyBooks",
    short_name: "MyBooks",
    description:
      "Sua vida de leitor, em uma estante só. Monte sua estante, organize coleções e descubra o que outros leitores andam lendo.",
    lang: "pt-BR",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // O manifest só aceita uma cor; a do tema escuro vai no viewport
    background_color: themeColors.light.background,
    theme_color: themeColors.light.background,
    categories: ["books", "social", "lifestyle"],
    icons: [
      { src: "/pwa/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/pwa/icone-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/pwa/icone-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/pwa/captura-estreita.png",
        sizes: "780x1688",
        type: "image/png",
        form_factor: "narrow",
        label: "A estante de uma leitora no MyBooks",
      },
      {
        src: "/pwa/captura-larga.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
        label: "Explorar livros, leitores e coleções",
      },
    ],
    shortcuts: [
      { name: "Explorar", url: "/explorar" },
      { name: "Comunidade", url: "/comunidade" },
    ],
  };
}
