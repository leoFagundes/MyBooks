"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Tentar de novo na página offline. Sem o JavaScript (que pode não estar no
 * cache), o formulário recarrega o mesmo endereço; com ele, recarrega com a
 * busca da URL inteira.
 */
export function RetryButton() {
  return (
    <form>
      <Button
        type="submit"
        onClick={(event) => {
          event.preventDefault();
          window.location.reload();
        }}
      >
        <RotateCw className="size-4" strokeWidth={1.5} aria-hidden />
        Tentar de novo
      </Button>
    </form>
  );
}
