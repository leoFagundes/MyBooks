import { ImageResponse } from "next/og";
import { ogFonts } from "./fonts";
import { OG_SIZE, OgWordmark } from "./parts";
import { ogColors } from "./theme";

/** A imagem de quando não há o que mostrar (livro sumido, coleção privada). */
export function genericOgImage(text: string) {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: 72,
        backgroundColor: ogColors.background,
      }}
    >
      <OgWordmark size={34} />
      <span
        style={{
          fontFamily: "Instrument Serif",
          fontSize: 88,
          lineHeight: 1.02,
          color: ogColors.foreground,
        }}
      >
        {text}
      </span>
    </div>,
    { ...OG_SIZE, fonts: [...ogFonts] },
  );
}
