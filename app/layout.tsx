import type { Metadata } from "next";
import { Providers } from "@/components/shell/providers";
import { ThemeScript } from "@/components/shell/theme-script";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: { default: "MyBooks", template: "%s · MyBooks" },
  description:
    "Sua vida de leitor, em uma estante só. Monte sua estante, organize coleções e descubra o que outros leitores andam lendo.",
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
      </body>
    </html>
  );
}
