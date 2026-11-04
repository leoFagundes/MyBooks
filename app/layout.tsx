import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/shell/providers";
import { ThemeScript } from "@/components/shell/theme-script";
import splashScreens from "@/features/pwa/splash-screens.json";
import { themeColors } from "@/lib/og/theme";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: { default: "MyBooks", template: "%s · MyBooks" },
  description:
    "Sua vida de leitor, em uma estante só. Monte sua estante, organize coleções e descubra o que outros leitores andam lendo.",
  // As imagens vêm dos opengraph-image de cada rota
  openGraph: { siteName: "MyBooks", locale: "pt_BR", type: "website" },
  twitter: { card: "summary_large_image" },
  icons: { apple: "/pwa/apple-icon-180.png" },
  appleWebApp: {
    capable: true,
    title: "MyBooks",
    statusBarStyle: "default",
    // As telas de abertura saem de npm run pwa:icones, uma por aparelho e tema
    startupImage: splashScreens.flatMap(([width, height, ratio]) =>
      (["claro", "escuro"] as const).map((theme) => ({
        url: `/pwa/abertura-${width * ratio}x${height * ratio}-${theme}.png`,
        media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait) and (prefers-color-scheme: ${theme === "claro" ? "light" : "dark"})`,
      })),
    ),
  },
};

export const viewport: Viewport = {
  // O notch e a barra de gestos ficam por conta das safe areas
  viewportFit: "cover",
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: themeColors.light.background,
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: themeColors.dark.background,
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // O script do tema muda data-theme e color-scheme antes da hidratação.
    <html lang="pt-BR" className={fontVariables} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <Providers>{children}</Providers>
        {/* SPEC §10: só mandam dados na Vercel, com os dois ligados no painel */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
