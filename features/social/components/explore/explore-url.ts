"use client";

import { useSyncExternalStore } from "react";

// A URL só é lida no navegador; no servidor e na hidratação, busca vazia
const noSubscription = () => () => {};
const readSearch = () => window.location.search;
const serverSearch = () => "";

/** O ?… do Explorar no primeiro render do navegador (a busca, a aba e o gênero). */
export function useExploreSearchParams() {
  return useSyncExternalStore(noSubscription, readSearch, serverSearch);
}

/**
 * Muda só as chaves dadas, sem ida ao servidor (o Next acompanha o
 * replaceState): a busca não apaga o gênero, e o gênero não apaga a busca.
 */
export function replaceExploreParams(patch: Record<string, string | null>) {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(patch)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${params.size > 0 ? `?${params}` : ""}`,
  );
}
