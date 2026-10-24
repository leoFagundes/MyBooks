import type { Metadata } from "next";
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
    <html lang="pt-BR" data-theme="light" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
