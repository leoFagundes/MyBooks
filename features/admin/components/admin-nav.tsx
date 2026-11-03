"use client";

import {
  ArrowLeft,
  LayoutDashboard,
  ScrollText,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { StaffRole } from "../queries";

const ITEMS = [
  {
    segment: null,
    href: routes.admin,
    label: "Visão geral",
    icon: LayoutDashboard,
    admin: false,
  },
  {
    segment: "usuarios",
    href: routes.adminUsuarios,
    label: "Usuários",
    icon: Users,
    admin: false,
  },
  {
    segment: "moderacao",
    href: routes.adminModeracao,
    label: "Moderação",
    icon: ShieldCheck,
    admin: false,
  },
  {
    segment: "configuracoes",
    href: routes.adminConfiguracoes,
    label: "Configurações",
    icon: Settings2,
    admin: true,
  },
  {
    segment: "auditoria",
    href: routes.adminAuditoria,
    label: "Auditoria",
    icon: ScrollText,
    admin: true,
  },
] as const;

/**
 * A barra lateral do painel (no celular, em cima). O item ativo vem do
 * segmento do layout; Configurações e Auditoria só aparecem para o admin.
 */
export function AdminNav({ role }: { role: StaffRole }) {
  const segment = useSelectedLayoutSegment();
  const items = ITEMS.filter((item) => role === "admin" || !item.admin);

  return (
    <nav
      aria-label="Painel"
      className="flex flex-col gap-6 border-b border-border p-4 md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-r md:border-b-0 md:p-6"
    >
      <div className="flex items-center justify-between gap-3 md:flex-col md:items-start">
        <p className="font-serif text-2xl leading-none">Painel</p>
        <span className="font-mono text-[11px] text-muted-foreground">
          {role === "admin" ? "admin" : "moderação"}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-1 md:grid-cols-1">
        {items.map((item) => {
          const active = segment === item.segment;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-control px-3 py-2 text-sm transition-colors before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-ring before:opacity-0",
                  active
                    ? "bg-muted text-foreground before:opacity-100"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon
                  className="size-4 shrink-0"
                  strokeWidth={1.5}
                  aria-hidden
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href={routes.inicio}
        className="mt-auto hidden items-center gap-2 rounded-control px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:flex"
      >
        <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
        Voltar ao MyBooks
      </Link>
    </nav>
  );
}
