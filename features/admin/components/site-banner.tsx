import { cn } from "@/lib/utils";
import { getSiteSettings } from "../queries";

/**
 * O aviso do topo, ligado no /admin/configuracoes. Em cache (tag
 * site-settings): mudar o aviso atualiza a tag, e as páginas não leem nada
 * da pessoa para mostrá-lo.
 */
export async function SiteBanner() {
  const { banner } = await getSiteSettings();
  if (!banner.enabled || !banner.message) return null;
  return (
    <aside
      aria-label="Aviso"
      className={cn(
        "px-4 py-2 text-center text-sm text-pretty",
        banner.tone === "aviso"
          ? "bg-primary text-primary-foreground"
          : "border-b border-border bg-muted text-foreground",
      )}
    >
      {banner.message}
    </aside>
  );
}
