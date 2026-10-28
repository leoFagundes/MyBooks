"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Na landing, depois de excluir a conta (`/?conta=excluida`): um até logo, e
 * a URL volta a ser só `/`.
 */
export function AccountDeletedNotice() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("conta") !== "excluida") return;
    toast("Sua conta foi excluída", {
      description: "Obrigado pelas leituras. A estante fica esperando você.",
    });
    url.searchParams.delete("conta");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, []);
  return null;
}
