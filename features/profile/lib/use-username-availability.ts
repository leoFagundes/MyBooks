"use client";

import { useEffect, useState } from "react";
import type { UsernameAvailability } from "./username";

export const AVAILABILITY_MESSAGES: Record<UsernameAvailability, string> = {
  available: "Disponível",
  yours: "Esse é o seu @",
  taken: "Esse @ já tem dono",
  invalid: "Use de 3 a 20 letras, números ou _",
  reserved: "Esse @ é reservado",
};

/** Confere o @ com debounce; enquanto a resposta não chega, "checking". */
export function useUsernameAvailability(username: string, own: string) {
  const [answer, setAnswer] = useState<{
    username: string;
    status: UsernameAvailability;
  } | null>(null);

  useEffect(() => {
    if (!username || username === own) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/usernames/availability?username=${encodeURIComponent(username)}`,
          { signal: controller.signal },
        );
        const { status } = (await response.json()) as {
          status: UsernameAvailability;
        };
        setAnswer({ username, status });
      } catch {
        // Cancelada pela próxima letra, ou sem rede: o salvar confere de novo
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [username, own]);

  if (!username) return null;
  if (username === own) return "yours" as const;
  return answer?.username === username ? answer.status : ("checking" as const);
}
