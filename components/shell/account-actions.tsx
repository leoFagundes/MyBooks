"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AddBookShortcut,
  useAddBook,
} from "@/features/shelf/components/add-book/add-book-provider";
import { routes } from "@/lib/routes";
import { AccountMenu } from "./account-menu";
import type { NavViewer } from "./nav-links";
import { NotificationsButton } from "./notifications-button";
import { ThemeToggle } from "./theme-toggle";

/**
 * O canto direito da barra: com conta, +, notificações e avatar; sem conta,
 * tema e Entrar. Enquanto a conta chega (undefined), nem um nem outro.
 */
export function AccountActions({
  viewer,
}: {
  viewer: NavViewer | null | undefined;
}) {
  const addBook = useAddBook();

  if (viewer === undefined) {
    return <Skeleton className="ml-1 size-8 rounded-full" />;
  }
  if (viewer === null) {
    return (
      <>
        <ThemeToggle />
        <Button size="sm" asChild className="ml-1">
          <Link href={routes.entrar}>Entrar</Link>
        </Button>
      </>
    );
  }
  return (
    <>
      <AddBookShortcut />
      <Button
        variant="ghost"
        size="icon"
        aria-label="Adicionar livro"
        aria-keyshortcuts="N"
        onClick={addBook.open}
        className="hidden md:inline-flex"
      >
        <Plus />
      </Button>
      <NotificationsButton userId={viewer.id} />
      <AccountMenu viewer={viewer} />
    </>
  );
}
