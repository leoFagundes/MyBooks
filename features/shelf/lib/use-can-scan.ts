"use client";

import { useMediaQuery } from "@/lib/use-media-query";

/**
 * O scanner aparece no toque (celular e tablet) com câmera, que o navegador
 * só oferece em HTTPS. No servidor e na hidratação, não aparece.
 */
export function useCanScan() {
  const touch = useMediaQuery("(pointer: coarse)");
  return touch && "mediaDevices" in navigator;
}
