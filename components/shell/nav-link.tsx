"use client";

import type { Route } from "next";
import { motion } from "motion/react";
import Link from "next/link";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: Route;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type NavLinkProps = {
  item: NavItem;
  active: boolean;
  /** Indicador compartilhado por layoutId: único por barra de navegação. */
  indicatorId: string;
  variant: "top" | "pill";
};

export function NavLink({ item, active, indicatorId, variant }: NavLinkProps) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={variant === "pill" ? item.label : undefined}
      className={cn(
        "relative flex items-center justify-center text-sm transition-colors",
        variant === "top" ? "h-8 rounded-control px-3" : "size-11 rounded-full",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {active && (
        <motion.span
          layoutId={indicatorId}
          transition={springs.snappy}
          className={cn(
            "absolute inset-0 bg-muted",
            variant === "top" ? "rounded-control" : "rounded-full",
          )}
        />
      )}
      <span className="relative flex items-center gap-2">
        {variant === "pill" && Icon ? <Icon className="size-5" /> : item.label}
      </span>
    </Link>
  );
}
