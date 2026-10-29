"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "@/components/shell/theme-provider";

/**
 * O carregando do toast (toast.promise): uma barra fina no rodapé, da largura
 * dele. Anima só transform (.toast-progresso no globals.css), que o
 * compositor toca mesmo com a thread principal ocupada.
 */
function ToastProgress() {
  return (
    <span
      aria-hidden
      className="toast-barra pointer-events-none absolute inset-x-4 bottom-2.5 h-0.5 overflow-hidden rounded-full bg-muted"
    >
      <span className="toast-progresso block size-full rounded-full bg-foreground" />
    </span>
  );
}

/** Toasts no tema do app, em baixo e no centro (acima da pílula no celular). */
function Toaster(props: ToasterProps) {
  const { resolved } = useTheme();
  return (
    <Sonner
      theme={resolved}
      position="bottom-center"
      offset={{ bottom: 24 }}
      mobileOffset={{ bottom: 96 }}
      icons={{ loading: <ToastProgress /> }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-3 rounded-card border border-border bg-popover px-4 py-3 font-sans text-sm text-popover-foreground sm:w-[356px]",
          // Respiro para a barra do carregando, alinhada ao texto
          loading: "pb-6",
          // Sem o CSS do Sonner (unstyled), a caixa do ícone não tem posição
          // nem tamanho: o ícone entra direto na linha, e a barra do
          // carregando se ancora no próprio toast
          icon: "contents",
          loader: "contents",
          title: "font-medium",
          description: "text-muted-foreground",
          actionButton:
            "ml-auto shrink-0 cursor-pointer rounded-control bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground",
          cancelButton:
            "shrink-0 cursor-pointer rounded-control bg-muted px-3 py-1.5 text-xs font-medium text-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
