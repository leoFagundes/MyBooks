"use client";

import { LoaderCircle, Share } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { foldText } from "@/lib/text-match";
import { cn } from "@/lib/utils";

// "Dom Casmurro" vira "citacao-dom-casmurro.png"
function fileName(title: string) {
  const slug = foldText(title)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `citacao-${slug || "mybooks"}.png`;
}

/**
 * Compartilhar a citação como imagem (spec §5.6). No celular, a folha de
 * compartilhar do aparelho, com o arquivo; no computador, baixa a PNG.
 */
export function ShareQuoteButton({
  quoteId,
  bookTitle,
  className,
}: {
  quoteId: string;
  bookTitle: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    try {
      const response = await fetch(`/api/quotes/${quoteId}/image`);
      if (!response.ok) throw new Error(`Imagem falhou (${response.status})`);
      const file = new File([await response.blob()], fileName(bookTitle), {
        type: "image/png",
      });
      const touch = window.matchMedia("(pointer: coarse)").matches;
      if (touch && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: bookTitle });
        } catch (error) {
          // Fechar a folha de compartilhar não é erro
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          throw error;
        }
        return;
      }
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Imagem baixada", { description: file.name });
    } catch {
      toast.error("Não deu para criar a imagem agora. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Compartilhar como imagem"
      onClick={() => void share()}
      disabled={busy}
      className={cn("shrink-0", className)}
    >
      {busy ? (
        <LoaderCircle className="animate-spin motion-reduce:animate-none" />
      ) : (
        <Share />
      )}
    </Button>
  );
}
