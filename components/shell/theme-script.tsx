import { themeInitScript } from "@/lib/theme";

/** Aplica o tema salvo antes da primeira pintura (fica no <head>). */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />;
}
