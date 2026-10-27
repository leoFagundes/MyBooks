"use client";

import type { BookVisual } from "@/features/books/types";
import { ProfileShelf } from "./profile-shelf";

/** A estante de quem está vendo, nas três visualizações. */
export function MyShelf({ books }: { books: BookVisual[] }) {
  return <ProfileShelf books={books} owner={null} />;
}
