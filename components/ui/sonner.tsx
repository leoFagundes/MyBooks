"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "@/components/shell/theme-provider";

/** Toasts no tema do app, em baixo e no centro (acima da pílula no celular). */
function Toaster(props: ToasterProps) {
  const { resolved } = useTheme();
  return (
    <Sonner
      theme={resolved}
      position="bottom-center"
      offset={{ bottom: 24 }}
      mobileOffset={{ bottom: 96 }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-3 rounded-card border border-border bg-popover px-4 py-3 font-sans text-sm text-popover-foreground sm:w-[356px]",
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
