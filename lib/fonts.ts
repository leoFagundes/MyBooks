import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

// Instrument Serif nos títulos de páginas e livros, Geist na interface e
// Geist Mono nos metadados pequenos (spec §2).

export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const fontVariables = [
  geistSans.variable,
  geistMono.variable,
  instrumentSerif.variable,
].join(" ");
