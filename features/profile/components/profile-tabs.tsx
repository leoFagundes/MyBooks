"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { springs } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * Estante · Coleções · Citações, com o indicador deslizando entre as abas.
 * A aba ativa vem do segmento abaixo do layout, e não da URL: o /@usuario é
 * um rewrite, e o pathname do servidor e o do navegador não batem.
 */
export function ProfileTabs({ username }: { username: string }) {
  const segment = useSelectedLayoutSegment();
  const tabs = [
    { segment: null, label: "Estante", href: routes.profile(username) },
    {
      segment: "colecoes",
      label: "Coleções",
      href: routes.profileTab(username, "colecoes"),
    },
    {
      segment: "citacoes",
      label: "Citações",
      href: routes.profileTab(username, "citacoes"),
    },
  ];

  return (
    <nav aria-label="Seções do perfil" className="border-b border-border">
      <ul className="flex items-center gap-6">
        {tabs.map((tab) => {
          const active = tab.segment === segment;
          return (
            <li key={tab.label}>
              <Link
                href={tab.href}
                // Trocar de aba não volta ao topo da página
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative -mb-px inline-flex pb-3 text-sm transition-colors focus-visible:outline-offset-4",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {active ? (
                  <motion.span
                    data-testid="aba-indicador"
                    layoutId={`perfil-${username}-aba`}
                    transition={springs.snappy}
                    className="absolute inset-x-0 -bottom-px h-px bg-foreground"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function ProfileTabsSkeleton() {
  return <div aria-hidden className="h-[37px] border-b border-border" />;
}
