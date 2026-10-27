"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function newQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // Resultado de busca não muda de um minuto para o outro
      queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

// Um cliente por render no servidor; no navegador, o mesmo a vida toda
function getQueryClient() {
  if (typeof window === "undefined") return newQueryClient();
  browserQueryClient ??= newQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}
